# Genera un histórico INVENTADO con la misma forma que el JSON que produce la importación del Excel.
# No usa ningún dato real: frentes, tipos y topógrafos son los de la lista inicial pública de la app.
# Uso: python3 generar_historico.py  → historico-prueba.json
import json, random, datetime, os
random.seed(20261106)
SUBS = {  # frente: (estructura, pkMin, pkMax, cantidad)
    'pp-oeste': ('pp', 0, 2700, 1000), 'pp-este': ('pp', 0, 1200, 600), 'pp-sur': ('pp', 0, 1800, 400),
    'pan': ('pan', 0, 400, 200), 'pao': ('pao', 0, 400, 150), 'tls': ('tls', 0, 1550, 150),
    'acc-norte': ('acc', 0, 250, 40), 'acc-noroeste': ('acc', 0, 650, 50), 'acc-sur': ('acc', 0, 200, 30),
    'acc-oeste': ('acc', 0, 100, 15), 'acc-perim-oeste': ('acc', 0, 100, 15), 'cas-01': ('cas', None, None, 10), 'cas-02': ('cas', None, None, 9),
}
TIPOS = {  # tipo: (elemento, nombre, capas máximas o 0, peso)
    'presa': [('masivo', 'mt', 'Relleno masivo', 30, 35), ('filtro1', 'mt', 'Relleno filtro 1', 25, 12), ('filtro2', 'mt', 'Relleno filtro 2', 23, 8),
              ('transicion', 'mt', 'Relleno de transición', 20, 8), ('stn', 'mt', 'Superficie de terreno nivelado', 0, 7), ('fundacion', 'mt', 'Fundación', 0, 5),
              ('zanja', 'mt', 'Zanja de anclaje', 0, 3), ('estructural', 'mt', 'Relleno estructural', 5, 3), ('geotextil', 'geo', 'Geotextil', 0, 3),
              ('geomembrana', 'geo', 'Geomembrana', 0, 3), ('cable', 'ins', 'Cable', 0, 3), ('cama-arena', 'ins', 'Cama de arena', 0, 2),
              ('perfilado', 'mt', 'Perfilado', 0, 2), ('talud-ref', 'mt', 'Talud referencial', 0, 2), ('relleno-zanja', 'mt', 'Relleno de zanja de anclaje', 0, 2)],
    'tls': [('tuberia', 'tub', 'Tubería', 0, 5), ('relleno-en-zanja', 'tub', 'Relleno en zanja', 6, 4), ('cama-arena', 'ins', 'Cama de arena', 0, 2)],
    'acc': [('stn', 'mt', 'Superficie de terreno nivelado', 0, 4), ('perfilado', 'mt', 'Perfilado', 0, 3), ('estructural', 'mt', 'Relleno estructural', 4, 3)],
    'cas': [('solado', 'civ', 'Solado', 0, 1), ('ubicacion', 'ins', 'Ubicación', 0, 1)],
}
NOM = {'pp-oeste': 'Presa Principal Oeste', 'pp-este': 'Presa Principal Este', 'pp-sur': 'Presa Principal Sur', 'pan': 'Presa Auxiliar Norte', 'pao': 'Presa Auxiliar Oeste',
       'tls': 'Línea Sur', 'acc-norte': 'Acceso Norte', 'acc-noroeste': 'Acceso Noroeste', 'acc-sur': 'Acceso Sur', 'acc-oeste': 'Acceso Oeste',
       'acc-perim-oeste': 'Acceso perimetral Oeste', 'cas-01': 'Caseta 01', 'cas-02': 'Caseta 02'}
TOPOS = ['AB', 'GN', 'CS', 'JL', 'JS', 'BN', 'CCH', 'LC', 'HQ']
def grupo(sub): return 'tls' if sub == 'tls' else 'acc' if sub.startswith('acc') else 'cas' if sub.startswith('cas') else 'presa'
regs = []
for sub, (est, a, b, n) in SUBS.items():
    lista = TIPOS[grupo(sub)]
    for _ in range(n):
        t = random.choices(lista, weights=[x[4] for x in lista])[0]
        tipo, ele, nombre, ncap, _w = t
        capa = '' if not ncap or random.random() < 0.12 else f'Capa {random.randint(1, ncap)}'
        if a is None: pk0 = pk1 = None
        else:
            largo = random.choice([10, 15, 20, 20, 25, 30, 40, 40, 50, 60])
            pk0 = round(random.uniform(a, max(a, b - largo)) / 5) * 5; pk1 = pk0 + largo
        regs.append({'actividad': 'LIB', 'descripcion': f'Liberación de {nombre.lower()}{" " + capa.lower() if capa else ""} en {NOM[sub]}',
                     'estructuraId': est, 'subestructuraId': sub, 'elementoId': ele, 'tipoId': tipo, 'pkInicio': None if pk0 is None else float(pk0),
                     'pkFin': None if pk1 is None else float(pk1), 'cota': '', 'capa': capa, 'area': None, 'observaciones': '',
                     'topografoId': random.choice(TOPOS), 'generadoPor': 'Gabinete prueba'})
# fuera del rango del frente Oeste (para el aviso del panel)
for r, (p0, p1) in zip(random.sample([x for x in regs if x['subestructuraId'] == 'pp-oeste' and x['tipoId'] == 'stn'], 5), [(2, 12), (5, 15), (2710, 2740), (2720, 2750), (8, 18)]):
    r['pkInicio'], r['pkFin'] = float(p0), float(p1)
# algunos levantamientos (sin liberación) y eliminados
for r in random.sample(regs, 40): r['actividad'] = 'LEV'
random.shuffle(regs)
inicio = datetime.datetime(2025, 3, 1, 8, 0); fin = datetime.datetime(2026, 11, 5, 17, 0)
paso = (fin - inicio) / len(regs)
for i, r in enumerate(regs):
    f = inicio + paso * i + datetime.timedelta(minutes=random.randint(0, 300))
    r['fechaCampo'] = int(f.timestamp() * 1000)
# códigos correlativos por fecha: el último es SKT-TOP-02684 (como en el Excel), el contador queda en 2689
for i, r in enumerate(regs): r['numero'] = 'SKT-TOP-%05d' % (2684 - len(regs) + 1 + i); r['id'] = 'xl-%05d' % (2684 - len(regs) + 1 + i)
ultimos = list(range(len(regs) - 1200, len(regs)))
ep = set(random.sample(ultimos, 727))
x = set(random.sample([i for i in range(len(regs)) if i not in ep], 30))
for i, r in enumerate(regs):
    r['estado'] = 'NA' if r['actividad'] != 'LIB' else 'EP' if i in ep else 'X' if i in x else 'EC'
    fl = r['fechaCampo'] + random.randint(0, 3) * 86400000
    r['fechaLiberacion'] = fl
    r['fechaEntrega'] = fl + random.randint(1, 10) * 86400000 if r['estado'] == 'EC' else None
    r['numeroCargo'] = ''
# Anclas que usan las pruebas del Modelo 2D: códigos que vienen en los nombres de superficies del eje de prueba
for cod, pk in [(2062, (672, 688)), (2161, (420, 450)), (2360, (0, 15))]:
    r = next(z for z in regs if z['numero'] == 'SKT-TOP-%05d' % cod)
    r.update({'actividad': 'LIB', 'estado': 'EC', 'estructuraId': 'pp', 'subestructuraId': 'pp-este', 'elementoId': 'mt', 'tipoId': 'filtro1', 'capa': '',
              'pkInicio': float(pk[0]), 'pkFin': float(pk[1]), 'descripcion': 'Liberación de relleno filtro 1 en Presa Principal Este'})
    r['fechaEntrega'] = r['fechaLiberacion'] + 86400000
out = {'version': 1, 'origen': 'historico-prueba (inventado)', 'ultimoNumero': 2689, 'topografosNuevos': ['CCH', 'LC', 'HQ'], 'registros': regs}
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'historico-prueba.json'), 'w'), ensure_ascii=False)
print(len(regs), 'registros inventados')
