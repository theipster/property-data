'use strict';

module.exports.expire = async event => {
  let id = event.detail.id;
  console.log(`Expiring Zoopla advert ${id}...`);

  throw new Error("Not yet implemented.");
};
