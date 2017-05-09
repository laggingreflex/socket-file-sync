import fs from 'fs-extra';
import pem from 'pem-promise';

export const read = async() => {
  const [cert, key] = await Promise.all([
    fs.readFile('ssl.cert', 'utf8'),
    fs.readFile('ssl.key', 'utf8'),
  ]);
  return { cert, key };
};

export const save = ({ cert, key }) => Promise.all([
  fs.writeFile('ssl.cert', cert),
  fs.writeFile('ssl.key', key),
]);

export const create = async() => {
  const ssl = await pem.createCertificate({ selfSigned: true });
  return {
    key: ssl.serviceKey,
    cert: ssl.certificate
  };
};
