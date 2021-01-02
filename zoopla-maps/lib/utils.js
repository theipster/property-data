'use strict';

module.exports.chunk = (items, batchSize) => {
  const numBatches = Math.ceil(items.length / batchSize);

  return items.reduce(
    (all, item, index) => {
      all[Math.floor(index / batchSize)].push(item);
      return all;
    },
    new Array(numBatches).fill().map(_ => [])
  );
};

module.exports.unique = items => {
  return [ ...new Set(items) ];
};
