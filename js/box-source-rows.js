window.szoBoxSourceRows = function(rows){
  return rows.flatMap(row => {
    const source = window.SZO_BOX_SOURCES[row.monsterId ?? row.monster?.ID];
    if(!source) return [row];
    const boxes = source.boxes.map(([boxId, name]) => ({...row, boxId, monsterName:name}));
    return source.keepMonster ? [row, ...boxes] : boxes;
  });
};
