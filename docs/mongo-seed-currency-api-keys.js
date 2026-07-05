const keys = [
  {
    keyValue: 'SUPER-SECRET-DEV-KEY-123',
    clientName: 'Frontend-Web-App',
    active: true,
  },
  {
    keyValue: 'EXPIRED-HACKER-KEY-999',
    clientName: 'Suspicious-Client',
    active: false,
  },
];

keys.forEach((key) => {
  db.api_keys.updateOne({ keyValue: key.keyValue }, { $set: key }, { upsert: true });
});

print('Seeded api_keys collection in currency_db.');
