import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';

// A disposable software authenticator exercises actual WebAuthn verification, without mocked signatures.
export function passkeyFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const jwk = publicKey.export({ format: 'jwk' });
  const id = randomBytes(32);
  const hash = (value: string | Buffer) =>
    createHash('sha256').update(value).digest();
  let userHandle = '';
  let counter = 0;
  function clientData(type: string, challenge: string, origin: string) {
    return Buffer.from(
      JSON.stringify({ type, challenge, origin, crossOrigin: false }),
    );
  }
  function authenticatorData(rpID: string, flags: number) {
    const count = Buffer.alloc(4);
    count.writeUInt32BE(counter);
    return Buffer.concat([hash(rpID), Buffer.from([flags]), count]);
  }
  return {
    id: id.toString('base64url'),
    register(
      options: PublicKeyCredentialCreationOptionsJSON,
      origin: string,
      flags = 0x45,
    ) {
      userHandle = options.user.id;
      const length = Buffer.alloc(2);
      length.writeUInt16BE(id.length);
      const cose = isoCBOR.encode(
        new Map<number, number | Uint8Array>([
          [1, 2],
          [3, -7],
          [-1, 1],
          [-2, new Uint8Array(Buffer.from(jwk.x!, 'base64url'))],
          [-3, new Uint8Array(Buffer.from(jwk.y!, 'base64url'))],
        ]),
      );
      const authData = Buffer.concat([
        authenticatorData(options.rp.id!, flags),
        Buffer.alloc(16),
        length,
        id,
        cose,
      ]);
      const attestation = isoCBOR.encode(
        new Map<string, string | Uint8Array | Map<string, never>>([
          ['fmt', 'none'],
          ['attStmt', new Map<string, never>()],
          ['authData', new Uint8Array(authData)],
        ]),
      );
      return {
        id: id.toString('base64url'),
        rawId: id.toString('base64url'),
        type: 'public-key',
        clientExtensionResults: {},
        response: {
          clientDataJSON: clientData(
            'webauthn.create',
            options.challenge,
            origin,
          ).toString('base64url'),
          attestationObject: Buffer.from(attestation).toString('base64url'),
          transports: ['internal'],
        },
      };
    },
    authenticate(
      options: PublicKeyCredentialRequestOptionsJSON,
      origin: string,
      flags = 0x05,
    ) {
      counter++;
      const data = clientData('webauthn.get', options.challenge, origin);
      const authData = authenticatorData(options.rpId!, flags);
      return {
        id: id.toString('base64url'),
        rawId: id.toString('base64url'),
        type: 'public-key',
        clientExtensionResults: {},
        response: {
          clientDataJSON: data.toString('base64url'),
          authenticatorData: authData.toString('base64url'),
          signature: sign(
            'sha256',
            Buffer.concat([authData, hash(data)]),
            privateKey,
          ).toString('base64url'),
          userHandle,
        },
      };
    },
  };
}
