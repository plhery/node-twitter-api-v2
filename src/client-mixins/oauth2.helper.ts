import * as crypto from 'crypto';

export class OAuth2Helper {
  static getCodeVerifier() {
    return this.generateRandomString(128);
  }

  static getCodeChallengeFromVerifier(verifier: string) {
    return this.escapeBase64Url(
      crypto
        .createHash('sha256')
        .update(verifier)
        .digest('base64'),
    );
  }

  static getAuthHeader(clientId: string, clientSecret: string) {
    const key = encodeURIComponent(clientId) + ':' + encodeURIComponent(clientSecret);
    return Buffer.from(key).toString('base64');
  }

  static generateRandomString(length: number) {
    return this.escapeBase64Url(
      crypto
        .randomBytes(Math.ceil(length * 3 / 4))
        .toString('base64'),
    ).slice(0, length);
  }

  private static escapeBase64Url(string: string) {
    return string.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
}
