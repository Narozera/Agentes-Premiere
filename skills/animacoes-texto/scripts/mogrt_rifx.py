"""Edit one leaf chunk of a RIFX file (After Effects .aep) in place, fixing the size of every LIST above it.
Only the path down to the target is parsed, so raw blocks (btdk) and trailing data (XMP) are never touched."""
import struct

def path_to(b, target, off=0, end=None):
    """List of chunk header offsets from the top RIFX down to the leaf chunk that contains byte `target`."""
    end = len(b) if end is None else end
    while off + 8 <= end:
        cid = b[off:off+4]; size = struct.unpack('>I', b[off+4:off+8])[0]
        ds = off + 8
        if ds <= target < ds + size:
            if cid in (b'LIST', b'RIFX'):
                sub = path_to(b, target, ds + 4, ds + size)
                return [off] + sub if sub is not None else None
            return [off]
        off = ds + size + (size & 1)
    return None

def replace_leaf(b, leaf_off, new_data):
    """New file bytes with the leaf chunk at leaf_off holding new_data; ancestors' sizes and pads are fixed."""
    chain = path_to(b, leaf_off + 8)
    if not chain or chain[-1] != leaf_off:
        raise ValueError('leaf not reachable at %d' % leaf_off)
    old_size = struct.unpack('>I', b[leaf_off+4:leaf_off+8])[0]
    out = bytearray(b)
    old_total = old_size + (old_size & 1); new_total = len(new_data) + (len(new_data) & 1)
    out[leaf_off+8:leaf_off+8+old_total] = new_data + (b'\x00' if len(new_data) & 1 else b'')
    out[leaf_off+4:leaf_off+8] = struct.pack('>I', len(new_data))
    delta = new_total - old_total
    for anc in reversed(chain[:-1]):
        s = struct.unpack('>I', out[anc+4:anc+8])[0]; ns = s + delta
        pad_old = s & 1; pad_new = ns & 1
        out[anc+4:anc+8] = struct.pack('>I', ns)
        end = anc + 8 + ns
        if pad_old and not pad_new: del out[end:end+1]
        elif pad_new and not pad_old: out[end:end] = b'\x00'
        delta += pad_new - pad_old
    return bytes(out)

def set_font_flags(b):
    """Every text-control JSON {"capPropFontEdit":false,...} -> true, as an exact JSON (chunk sizes fixed)."""
    import re
    n = 0
    hits = [m.start() for m in re.finditer(rb'Utf8....\{"capPropFontEdit":false', b, re.S)]
    for off in reversed(hits):
        size = struct.unpack('>I', b[off+4:off+8])[0]
        data = b[off+8:off+8+size]
        new = data.replace(b'"capPropFontEdit":false', b'"capPropFontEdit":true') \
                  .replace(b'"capPropFontFauxStyleEdit":false', b'"capPropFontFauxStyleEdit":true') \
                  .replace(b'"capPropFontSizeEdit":false', b'"capPropFontSizeEdit":true')
        b = replace_leaf(b, off, new); n += 1
    return b, n

if __name__ == '__main__':
    import sys
    src = open(sys.argv[1], 'rb').read()
    out, n = set_font_flags(src)
    print('json patched:', n, len(src), '->', len(out))
    # sanity: every patched leaf still reachable and top RIFX size consistent
    top = struct.unpack('>I', out[4:8])[0]
    print('RIFX size', top, 'tail', len(out) - 8 - top)
