const roles = ['BUYER', 'SELLER', 'ADMIN'];

const roleRights = new Map();
roleRights.set(roles[0], ['getUsers', 'manageUsers', 'manageProducts']);
roleRights.set(roles[1], ['getUsers', 'manageUsers', 'manageProducts']);
roleRights.set(roles[2], ['getUsers', 'manageUsers', 'manageProducts']);

module.exports = {
  roles,
  roleRights,
};
