# Genera un eje INVENTADO en LandXML (alineamiento + secciones) con la forma que exporta Civil 3D,
# para probar el Modelo 2D sin usar el archivo real. Uso: python3 generar_eje.py → eje-prueba.xml
import math, os
N0, E0, H0 = 8300000.0, 490000.0, math.radians(30)   # inicio (Norte, Este) y rumbo inicial desde el Este
elems = [('L', 800.0), ('C', 60.0, 40, 'ccw'), ('L', 700.0), ('C', 80.0, 30, 'cw')]
largo_total = 2634.25
usado = sum(e[1] if e[0] == 'L' else e[1] * math.radians(e[2]) for e in elems)
elems.append(('L', largo_total - usado))
geo, pts, n, e, h, pk = [], [], N0, E0, H0, 0.0
def punto(pk, e, n): pts.append((pk, e, n))
for el in elems:
    if el[0] == 'L':
        L = el[1]; e2, n2 = e + L * math.cos(h), n + L * math.sin(h)
        geo.append(f'<Line length="{L:.6f}"><Start>{n:.6f} {e:.6f}</Start><End>{n2:.6f} {e2:.6f}</End></Line>')
        for i in range(0, int(L) + 1): punto(pk + i, e + i * math.cos(h), n + i * math.sin(h))
        e, n, pk = e2, n2, pk + L
    else:
        R, ang, rot = el[1], math.radians(el[2]), el[3]; s = 1 if rot == 'ccw' else -1; L = R * ang
        ce, cn = e + R * math.cos(h + s * math.pi / 2), n + R * math.sin(h + s * math.pi / 2)
        a0 = math.atan2(n - cn, e - ce)
        e2, n2 = ce + R * math.cos(a0 + s * ang), cn + R * math.sin(a0 + s * ang)
        geo.append(f'<Curve rot="{rot}" length="{L:.6f}" radius="{R:.6f}"><Start>{n:.6f} {e:.6f}</Start><Center>{cn:.6f} {ce:.6f}</Center><End>{n2:.6f} {e2:.6f}</End></Curve>')
        for i in range(0, int(L) + 1): a = a0 + s * i / R; punto(pk + i, ce + R * math.cos(a), cn + R * math.sin(a))
        e, n, pk, h = e2, n2, pk + L, h + s * ang
# Secciones cada 20 m (más 0+008.66 y el final), con superficies de diseño de una presa y algunas liberaciones
stas = [0.0, 8.66] + [float(x) for x in range(20, 2621, 20)] + [largo_total]
def dz(s): return 0.4 * math.sin(s / 300.0)
DIS = {
    'Presa principal etapa 2 plus Final': lambda s: [[(-40, 770 + dz(s)), (-2.5, 797.0 + dz(s)), (11.5, 797.0 + dz(s)), (52, 778 + dz(s))]],
    'TOP_RELLENO_F1_más_CORONA E2': lambda s: [[(-2.5, 796.6 + dz(s)), (11.5, 796.6 + dz(s)), (52, 786.0 + dz(s))]],
    '_NUEVO BASE FILTRO 01': lambda s: [[(-2.5, 796.3 + dz(s)), (11.5, 796.3 + dz(s)), (50, 785.5 + dz(s))]],
    'Filtro-2_Base': lambda s: [[(-2.5, 795.1 + dz(s)), (11.5, 795.1 + dz(s)), (48, 784.5 + dz(s))]],
    'Base Material Transicion': lambda s: [[(-2.5, 794.5 + dz(s)), (11, 794.5 + dz(s)), (45, 783.5 + dz(s))], [(-35, 772 + dz(s)), (-5, 790 + dz(s))]],
    'PPOS_784.40_NB_T_SA_3': lambda s: [[(-40, 784.4), (60, 784.4)]] if s < 1700 else [],
}
def top(s, o):  # cota del tope de relleno F1 en (s, o)
    if o <= 11.5: return 796.6 + dz(s)
    return 796.6 + dz(s) + (786.0 - 796.6) * (o - 11.5) / (52 - 11.5)
LIB = {  # liberaciones que ya vienen cortadas en las secciones (nombres como los de Civil 3D)
    '0_672_0_688_STN F1_SKT-TOP-02062': [680.0], '2026.09.11_ PP filtro 1_ 0_450__0_475': [460.0],
    '0+420_0+450_STN F1_SKT-TOP-02161': [420.0, 440.0], '0_000_0_015_STN F1_SKT-TOP-02360': [0.0, 8.66],
    '2026.09.15_ PP filtro 1_ 0_330__0_390 (1)': [340.0, 360.0, 380.0], '210826ETAPA2-550 (1)': [580.0],
}
JUNK = {'xxx': [1000.0], 'XXX': [2220.0]}
cs, k = [], 0
for s in stas:
    surf = []
    def add(nombre, pl):
        global k; k += 1
        surf.append(f'<CrossSectSurf name="SL Collection - 1 - {s:.2f} ({k}) - {nombre}({k})"><PntList2D>{" ".join(f"{o:.3f} {z:.3f}" for o, z in pl)}</PntList2D></CrossSectSurf>')
    for nombre, f in DIS.items():
        for pl in f(s): add(nombre, pl)
    for nombre, ss in LIB.items():
        if s in ss: add(nombre, [(o, top(s, o) + 0.05) for o in [11.5 + 2.5 * i for i in range(12)]])
    for nombre, ss in JUNK.items():
        if s in ss: add(nombre, [(11.5, 790.0), (40.0, 780.0)])
    cs.append(f'<CrossSect name="{s:.2f}" sta="{s:.6f}">{"".join(surf)}</CrossSect>')
xml = f'''<?xml version="1.0"?>
<LandXML xmlns="http://www.landxml.org/schema/LandXML-1.2" date="2026-11-06" time="12:00:00" version="1.2" language="English" readOnly="false">
<Units><Metric areaUnit="squareMeter" linearUnit="meter" volumeUnit="cubicMeter" temperatureUnit="celsius" pressureUnit="milliBars" diameterUnit="millimeter" angularUnit="decimal degrees" directionUnit="decimal degrees"></Metric></Units>
<CoordinateSystem desc="Eje inventado para pruebas" epsgCode="32718"></CoordinateSystem>
<Project name="eje-prueba.dwg"></Project>
<Application name="Autodesk Civil 3D" desc="Civil 3D" manufacturer="Autodesk, Inc." version="2026"></Application>
<Alignments name=""><Alignment name="EJE PRUEBA" length="{largo_total:.6f}" staStart="0.000000"><CoordGeom>{"".join(geo)}</CoordGeom><CrossSects>{"".join(cs)}</CrossSects></Alignment></Alignments>
</LandXML>
'''
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'eje-prueba.xml'), 'w').write(xml)
print(len(stas), 'secciones;', 'largo', round(pk, 2))
