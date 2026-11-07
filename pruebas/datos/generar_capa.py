# Genera XML INVENTADOS para probar el avance por capa en planta real, sobre el eje de prueba:
#  - base-capa-tin.xml: superficie TIN de la capa entre 2+200 y 2+300 (desfase 11.5 a 49 m) → 3,750 m²
#  - base-capa-contorno.xml: el mismo borde como parcela (contorno cerrado)
#  - liberacion-cruce.xml: 2+250 a 2+290 (se cruza 10 m con la de 2+220 a 2+260)
#  - liberacion-fuera.xml: 2+290 a 2+310 (la mitad queda fuera de la base)
# Uso: python3 generar_capa.py eje-prueba.xml
import sys, math, os, xml.etree.ElementTree as ET
ns = {'l': 'http://www.landxml.org/schema/LandXML-1.2'}
aqui = os.path.dirname(os.path.abspath(__file__))
al = ET.parse(sys.argv[1]).getroot().find('.//l:Alignment', ns)
xy = lambda t: tuple(float(v) for v in t.split())
pts, pk = [], 0.0
for g in al.find('l:CoordGeom', ns):
    tag = g.tag.split('}')[1]; sN, sE = xy(g.find('l:Start', ns).text); eN, eE = xy(g.find('l:End', ns).text); L = float(g.get('length')); n = max(2, int(L) + 1)
    if tag == 'Line':
        for i in range(n): t = i / (n - 1); pts.append((pk + L * t, sE + (eE - sE) * t, sN + (eN - sN) * t))
    else:
        cN, cE = xy(g.find('l:Center', ns).text); R = float(g.get('radius')); a0 = math.atan2(sN - cN, sE - cE); sw = L / R * (1 if g.get('rot') == 'ccw' else -1)
        for i in range(n): t = i / (n - 1); a = a0 + sw * t; pts.append((pk + L * t, cE + R * math.cos(a), cN + R * math.sin(a)))
    pk += L
def en(s, o):
    for i in range(1, len(pts)):
        if pts[i][0] >= s:
            a, b = pts[i - 1], pts[i]; t = (s - a[0]) / ((b[0] - a[0]) or 1); d = math.hypot(b[1] - a[1], b[2] - a[2]); dE, dN = (b[1] - a[1]) / d, (b[2] - a[2]) / d
            return a[1] + (b[1] - a[1]) * t + o * dN, a[2] + (b[2] - a[2]) * t - o * dE
def z(s, o): return 796.6 + 0.4 * math.sin(s / 300.0) + (0 if o <= 11.5 else (786.0 - 796.6) * (o - 11.5) / (52 - 11.5)) + 0.03
CAB = '<?xml version="1.0"?>\n<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" date="2026-11-07" time="05:00:00" version="1.2" language="English" readOnly="false">\n<Units><Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="milliBars" diameterUnit="millimeter" angularUnit="decimal degrees" directionUnit="decimal degrees"></Metric></Units>\n<CoordinateSystem desc="Inventado para pruebas" epsgCode="32718"></CoordinateSystem>\n'
def tin(nombre, s0, s1, archivo, o0=11.5, o1=49.0):
    ss = [s0 + (s1 - s0) * i / max(1, round((s1 - s0) / 2.5)) for i in range(round((s1 - s0) / 2.5) + 1)]
    oo = [o0 + (o1 - o0) * j / 25 for j in range(26)]
    P, F, idx = [], [], {}
    for i, s in enumerate(ss):
        for j, o in enumerate(oo): E, N = en(s, o); idx[(i, j)] = len(P) + 1; P.append((N, E, z(s, o)))
    for i in range(len(ss) - 1):
        for j in range(len(oo) - 1):
            a, b, c, d = idx[(i, j)], idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)]; F += [(a, b, c), (a, c, d)]
    x = CAB + f'<Surfaces><Surface name="{nombre}"><Definition surfType="TIN"><Pnts>' + ''.join(f'<P id="{k + 1}">{n:.4f} {e:.4f} {zz:.4f}</P>' for k, (n, e, zz) in enumerate(P)) + '</Pnts><Faces>' + ''.join(f'<F>{a} {b} {c}</F>' for a, b, c in F) + '</Faces></Definition></Surface></Surfaces>\n</LandXML>\n'
    open(os.path.join(aqui, archivo), 'w').write(x)
tin('BASE_F1_CAPA_11', 2200, 2300, 'base-capa-tin.xml')
tin('2+250_2+290_STN F1_SKT-TOP-02687', 2250, 2290, 'liberacion-cruce.xml')
tin('2+290_2+310_STN F1_SKT-TOP-02688', 2290, 2310, 'liberacion-fuera.xml')
# Contorno cerrado como parcela (líneas)
borde = [en(2200 + 5 * i, 11.5) for i in range(21)] + [en(2300 - 5 * i, 49.0) for i in range(21)]
lineas = ''.join(f'<Line><Start>{a[1]:.4f} {a[0]:.4f}</Start><End>{b[1]:.4f} {b[0]:.4f}</End></Line>' for a, b in zip(borde, borde[1:] + borde[:1]))
open(os.path.join(aqui, 'base-capa-contorno.xml'), 'w').write(CAB + f'<Parcels><Parcel name="CONTORNO F1 CAPA 11"><CoordGeom>{lineas}</CoordGeom></Parcel></Parcels>\n</LandXML>\n')
print('listo: base 3,750 m²; cruce 375 m²; fuera 375 m²')
