export const slug = (s) => s.toLowerCase().trim().replace(/\s+/g, '-');
const _ = null;

export const PLAYERS = [
  ['Jordi', 'F7/F11', 'Portero', ''],
  ['Cesar', 'F7/F11', 'Portero', ''],
  ['Oscar Heras', 'F7', 'Lateral derecho', 'Banda'],
  ['Shai', 'F7', 'Lateral derecho', 'Banda'],
  ['Domi', 'F7', 'Lateral derecho', 'Banda'],
  ['Gerard', 'F7', 'Lateral derecho', 'Banda'],
  ['Islam', 'F7', 'Central', 'Lateral izquierdo'],
  ['Toni', 'F11', 'Central', 'Lateral derecho'],
  ['Sergio Rubio', 'F7', 'Central', 'Mediocampista'],
  ['Alvaro', 'F7', 'Central', 'Lateral izq/dcho'],
  ['Adrian Campoy', 'F11', 'Lateral izquierdo', 'Mediocampista'],
  ['Roc', 'F11', 'Mediocampista', 'Central'],
  ['Marc Castell', 'F11', 'Mediocampista', ''],
  ['Leo', 'F11', 'Mediocampista', 'Banda'],
  ['James', 'F7', 'Banda', ''],
  ['Enzo', 'F11', 'Banda', 'Lateral izquierdo'],
  ['Jiaqui', 'F7', 'Banda', ''],
  ['Adri Rubio', 'F7', 'Banda', 'Mediocampista'],
  ['Aiden', 'F7', 'Banda', 'Delantero centro'],
  ['Rai', 'F7', 'Delantero centro', 'Banda'],
  ['Marc Lopez', 'F11', 'Delantero centro', 'Banda'],
  ['Adri Campayo', 'F7', 'Delantero centro', 'Banda'],
  ['Amir', 'F7', 'Delantero centro', ''],
].map(([name, ficha, pos, alt]) => ({ id: slug(name), name, ficha, pos, alt }));

const F7_RIVALS = ['Escolar','Xilvar','Serverense','Collerense','Palmanyola','Ferriolense','Manacor','Son Ferrer','Atlético Rafal',"Cala d'Or",'Viva Sports','Santa Catalina','Liceu','Pollença i Port','Baleares Sin Fronteras','Buñola','Atlas Mallorca','Can Picafort','BVB Internacional','Porto Cristo','Arenal'];
const F11_RIVALS = ['Son Caliu','San Cayetano','Bellver','Génova','CIDE','Andratx','Santa Mónica','Ciutat de Palma','Santa Catalina','Sóller','Playas de Calvià','Ágora','BVB Internacional','Paguera','Madre Alberta'];

// Partes por partido jugado (null = no convocado en esa categoría)
const F7_TABLE = {
  'Jordi': [0,0,4,_,_,_], 'Cesar': [4,4,0,4,4,4], 'Oscar Heras': [3,0,0,_,_,3],
  'Shai': [0,3,4,_,_,_], 'Domi': [3,3,0,3,3,_], 'Gerard': [3,3,3,3,3,3],
  'Islam': [3,0,0,4,4,3], 'Sergio Rubio': [0,3,4,_,_,_], 'Alvaro': [3,0,0,4,_,_],
  'James': [0,0,3,_,4,4], 'Jiaqui': [2,2,0,2,2,2], 'Adri Rubio': [0,3,4,_,_,_],
  'Aiden': [0,3,3,_,3,4], 'Rai': [3,0,0,3,_,_], 'Adri Campayo': [2,2,0,3,3,3],
  'Amir': [2,2,3,2,2,2],
};
const F11_TABLE = {
  'Jordi': [3,3,1,4,4,4], 'Cesar': [1,1,3,0,0,_], 'Oscar Heras': [0,3,3,3,2,1],
  'Shai': [3,0,0,2,3,2], 'Domi': [0,1,3,1,0,2], 'Gerard': [1,2,0,1,0,0],
  'Islam': [2,2,3,1,0,0], 'Toni': [4,4,4,4,4,4], 'Sergio Rubio': [3,3,0,4,3,4],
  'Alvaro': [0,3,3,0,3,2], 'Adrian Campoy': [3,2,0,0,3,3], 'Roc': [3,4,3,4,3,4],
  'Marc Castell': [2,0,0,0,0,0], 'Leo': [4,0,4,4,4,4], 'James': [0,0,0,2,2,0],
  'Enzo': [3,4,3,3,3,4], 'Jiaqui': [0,0,2,0,0,0], 'Adri Rubio': [3,3,0,3,3,3],
  'Aiden': [3,0,2,4,3,0], 'Rai': [2,3,3,0,3,0], 'Marc Lopez': [4,4,2,4,3,4],
  'Adri Campayo': [0,1,3,0,0,2], 'Amir': [0,0,2,0,1,0],
};

const buildMatches = (cat, rivals, table, nPlayed) =>
  rivals.map((rival, i) => ({
    id: `${cat}-${i}`, cat, rival, home: null, played: i < nPlayed,
    parts: Object.fromEntries(
      Object.entries(table)
        .map(([n, a]) => [slug(n), a[i]])
        .filter(([, v]) => v !== undefined && v !== null)
    ),
  }));

// Goles acumulados [F7, F11]
const GOALS = {
  'Shai':[1,0],'Domi':[5,0],'Gerard':[2,0],'Islam':[1,0],'Alvaro':[1,1],'Adrian Campoy':[0,1],
  'Roc':[0,3],'Leo':[0,8],'James':[3,0],'Enzo':[0,1],'Jiaqui':[0,1],'Adri Rubio':[9,1],
  'Aiden':[0,2],'Rai':[7,2],'Marc Lopez':[0,10],'Adri Campayo':[1,2],'Amir':[3,0],
};

export const seed = () => ({
  players: PLAYERS,
  matches: [
    ...buildMatches('F7', F7_RIVALS, F7_TABLE, 6),
    ...buildMatches('F11', F11_RIVALS, F11_TABLE, 6),
  ],
  goals: Object.fromEntries(
    Object.entries(GOALS).map(([n, [f7, f11]]) => [slug(n), { f7, f11 }])
  ),
});