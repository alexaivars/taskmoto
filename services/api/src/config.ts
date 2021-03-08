import 'dotenv/config'

if(!process.env.JWT_ACCESS_TOKEN_SECRET) {
  throw new Error('Missing JWT_ACCESS_TOKEN_SECRET');
}

if(!process.env.JWT_ACCESS_TOKEN_PUBLIC) {
  throw new Error('Missing JWT_ACCESS_TOKEN_PUBLIC');
}

if(!process.env.SSL_PRIVATE_KEY) {
  throw new Error('Missing SSL_PRIVATE_KEY');
}

if(!process.env.SSL_CERTIFICATE) {
  throw new Error('Missing SSL_PRIVATE_KEY');
}

export const jwtAccessTokenSecret:string = process.env.JWT_ACCESS_TOKEN_SECRET;
export const jwtAccessTokenPublic:string = process.env.JWT_ACCESS_TOKEN_PUBLIC;
export const sslPrivateKey:string = process.env.SSL_PRIVATE_KEY;
export const sslCertificate:string = process.env.SSL_CERTIFICATE;



