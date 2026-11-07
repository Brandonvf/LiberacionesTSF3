# Genera una liberación de prueba (superficie TIN LandXML) sobre el eje INVENTADO de pruebas:
# «2+220_2+260_STN F1_SKT-TOP-02686», 3 cm sobre el tope de relleno F1 del diseño, con ±2 cm de ruido.
# Uso: python3 inventar_liberacion.py eje-prueba.xml liberacion-prueba.xml
import sys, re, math, random, xml.etree.ElementTree as ET
ns = {'l': 'http://www.landxml.org/schema/LandXML-1.2'}
src, out = sys.argv[1], sys.argv[2]
r = ET.parse(src).getroot()
al = r.find('.//l:Alignment', ns)
xy = lambda t: tuple(float(v) for v in t.split())  # N E

# eje densificado [(pk, E, N)]
pts, pk = [], 0.0
for g in al.find('l:CoordGeom', ns):
    tag = g.tag.split('}')[1]
    sN, sE = xy(g.find('l:Start', ns).text); eN, eE = xy(g.find('l:End', ns).text)
    L = float(g.get('length'))
    n = max(2, int(L / 1) + 1)
    if tag == 'Line':
        for i in range(n): t = i / (n - 1); pts.append((pk + L * t, sE + (eE - sE) * t, sN + (eN - sN) * t))
    else:
        cN, cE = xy(g.find('l:Center', ns).text); R = float(g.get('radius'))
        a0 = math.atan2(sN - cN, sE - cE); sw = L / R * (1 if g.get('rot') == 'ccw' else -1)
        for i in range(n): t = i / (n - 1); a = a0 + sw * t; pts.append((pk + L * t, cE + R * math.cos(a), cN + R * math.sin(a)))
    pk += L

def en(pkv):
    for i in range(1, len(pts)):
        if pts[i][0] >= pkv:
            a, b = pts[i - 1], pts[i]; t = (pkv - a[0]) / ((b[0] - a[0]) or 1)
            E, N = a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t
            d = math.hypot(b[1] - a[1], b[2] - a[2]); dE, dN = (b[1] - a[1]) / d, (b[2] - a[2]) / d
            return E, N, dE, dN
    raise ValueError(pkv)

# tope de relleno de filtro 1 del diseño en las secciones 2+220, 2+240 y 2+260
dis = {}
for cs in al.findall('.//l:CrossSect', ns):
    sta = float(cs.get('sta'))
    if 2200 <= sta <= 2280:
        for s in cs.findall('l:CrossSectSurf', ns):
            if 'TOP_RELLENO_F1' in s.get('name'):
                v = [float(x) for x in s.find('l:PntList2D', ns).text.split()]; dis[sta] = list(zip(v[::2], v[1::2]))
def zdis(sta, off):
    ks = sorted(dis); k0 = max([k for k in ks if k <= sta] or [ks[0]]); k1 = min([k for k in ks if k >= sta] or [ks[-1]])
    def zi(k):
        p = dis[k]
        for i in range(1, len(p)):
            if p[i - 1][0] <= off <= p[i][0]: t = (off - p[i - 1][0]) / ((p[i][0] - p[i - 1][0]) or 1); return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t
        return p[0][1] if off < p[0][0] else p[-1][1]
    if k1 == k0: return zi(k0)
    t = (sta - k0) / (k1 - k0); return zi(k0) * (1 - t) + zi(k1) * t

random.seed(7)
stas = [2220 + 2.5 * i for i in range(17)]          # 2+220 a 2+260 cada 2.5 m
offs = [11.5 + 1.5 * j for j in range(26)]           # 11.5 a 49.0 m (talud de filtro 1, como las liberaciones reales)
P, idx = [], {}
for i, s in enumerate(stas):
    E0, N0, dE, dN = en(s)
    for j, o in enumerate(offs):
        E, N = E0 + o * dN, N0 - o * dE               # derecha del eje = (dN, −dE)
        z = zdis(s, o) + 0.03 + random.uniform(-0.02, 0.02)
        idx[(i, j)] = len(P) + 1; P.append((N, E, z))
F = []
for i in range(len(stas) - 1):
    for j in range(len(offs) - 1):
        a, b, c, d = idx[(i, j)], idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)]
        F += [(a, b, c), (a, c, d)]
nombre = '2+220_2+260_STN F1_SKT-TOP-02686'
xml = ['<?xml version="1.0"?>',
       '<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" date="2026-11-06" time="16:00:00" version="1.2" language="English" readOnly="false">',
       '\t<Units><Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="milliBars" diameterUnit="millimeter" angularUnit="decimal degrees" directionUnit="decimal degrees"></Metric></Units>',
       '\t<CoordinateSystem desc="UTM-WGS 1984 datum, Zone 18 South, Meter" epsgCode="32718"></CoordinateSystem>',
       f'\t<Project name="{nombre}.dwg"></Project>',
       '\t<Application name="Autodesk Civil 3D" desc="Civil 3D" manufacturer="Autodesk, Inc." version="2026"></Application>',
       '\t<Surfaces>', f'\t\t<Surface name="{nombre}" desc="Liberación de prueba (inventada)">',
       '\t\t\t<Definition surfType="TIN">', '\t\t\t\t<Pnts>']
xml += [f'\t\t\t\t\t<P id="{k + 1}">{n:.4f} {e:.4f} {z:.4f}</P>' for k, (n, e, z) in enumerate(P)]
xml += ['\t\t\t\t</Pnts>', '\t\t\t\t<Faces>'] + [f'\t\t\t\t\t<F>{a} {b} {c}</F>' for a, b, c in F] + ['\t\t\t\t</Faces>', '\t\t\t</Definition>', '\t\t</Surface>', '\t</Surfaces>', '</LandXML>']
open(out, 'w').write('\n'.join(xml) + '\n')
print(len(P), 'puntos', len(F), 'triángulos; cota media', round(sum(p[2] for p in P) / len(P), 3))
