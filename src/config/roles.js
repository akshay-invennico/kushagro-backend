const roles = ['BUYER', 'SELLER', 'ADMIN'];

const roleRights = new Map();
roleRights.set(roles[0], ['getUser', 'getUsers', 'manageUsers', 'manageProducts']);
roleRights.set(roles[1], ['getUser', 'getUsers', 'manageUsers', 'manageProducts']);
roleRights.set(roles[2], ['getUser', 'getUsers', 'manageUsers', 'manageProducts', 'manageCommission']);

module.exports = {
  roles,
  roleRights,
};
