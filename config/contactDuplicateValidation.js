module.exports = {
  createContact: {
    enabled: true,
    checkFamilyMembers: true,
    rules: [
      {
        id: 'mobile_same',
        enabled: true,
        fields: ['mobile'],
      },
      {
        id: 'name_address_same',
        enabled: true,
        fields: ['name', 'address'],
      },
    ],
  },
};
