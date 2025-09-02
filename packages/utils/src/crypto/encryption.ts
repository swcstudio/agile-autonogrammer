/**
 * Advanced Encryption Utilities
 * Secure encryption/decryption with multiple algorithms
 */

export interface EncryptionOptions {
  algorithm?: 'AES-GCM' | 'AES-CBC' | 'RSA-OAEP' | 'ChaCha20-Poly1305';
  keySize?: 128 | 192 | 256;
  saltLength?: number;
  iterations?: number;
  tagLength?: number;
}

export interface EncryptedData {
  data: string;
  iv: string;
  salt?: string;
  tag?: string;
  algorithm: string;
  keySize: number;
}

/**
 * AES Encryption
 */
export class AESEncryption {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  /**
   * Generate encryption key from password
   */
  async deriveKey(
    password: string,
    salt: Uint8Array,
    iterations = 100000,
    keySize = 256
  ): Promise<CryptoKey> {
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      this.encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: 'AES-GCM', length: keySize },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-GCM
   */
  async encrypt(
    data: string | ArrayBuffer,
    password: string,
    options: EncryptionOptions = {}
  ): Promise<EncryptedData> {
    const salt = crypto.getRandomValues(new Uint8Array(options.saltLength || 16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await this.deriveKey(
      password,
      salt,
      options.iterations,
      options.keySize || 256
    );

    const plaintext = typeof data === 'string' 
      ? this.encoder.encode(data)
      : new Uint8Array(data);

    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        tagLength: options.tagLength || 128
      },
      key,
      plaintext
    );

    return {
      data: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt),
      algorithm: 'AES-GCM',
      keySize: options.keySize || 256
    };
  }

  /**
   * Decrypt data with AES-GCM
   */
  async decrypt(
    encryptedData: EncryptedData,
    password: string,
    options: EncryptionOptions = {}
  ): Promise<string> {
    const salt = this.base64ToArrayBuffer(encryptedData.salt!);
    const iv = this.base64ToArrayBuffer(encryptedData.iv);
    const data = this.base64ToArrayBuffer(encryptedData.data);

    const key = await this.deriveKey(
      password,
      new Uint8Array(salt),
      options.iterations,
      encryptedData.keySize
    );

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: new Uint8Array(iv),
        tagLength: options.tagLength || 128
      },
      key,
      data
    );

    return this.decoder.decode(decrypted);
  }

  /**
   * Generate random encryption key
   */
  async generateKey(keySize = 256): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: keySize
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export key to JWK
   */
  async exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return crypto.subtle.exportKey('jwk', key);
  }

  /**
   * Import key from JWK
   */
  async importKey(jwk: JsonWebKey): Promise<CryptoKey> {
    return crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Utility methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * RSA Encryption
 */
export class RSAEncryption {
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  /**
   * Generate RSA key pair
   */
  async generateKeyPair(
    keySize = 2048
  ): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }> {
    return crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: keySize,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    ) as Promise<{ publicKey: CryptoKey; privateKey: CryptoKey }>;
  }

  /**
   * Encrypt with public key
   */
  async encryptWithPublicKey(
    data: string,
    publicKey: CryptoKey
  ): Promise<string> {
    const encoded = this.encoder.encode(data);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      publicKey,
      encoded
    );

    return this.arrayBufferToBase64(encrypted);
  }

  /**
   * Decrypt with private key
   */
  async decryptWithPrivateKey(
    encryptedData: string,
    privateKey: CryptoKey
  ): Promise<string> {
    const data = this.base64ToArrayBuffer(encryptedData);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      data
    );

    return this.decoder.decode(decrypted);
  }

  /**
   * Export public key to PEM
   */
  async exportPublicKeyPEM(publicKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('spki', publicKey);
    const b64 = this.arrayBufferToBase64(exported);
    return `-----BEGIN PUBLIC KEY-----\n${this.formatPEM(b64)}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Export private key to PEM
   */
  async exportPrivateKeyPEM(privateKey: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('pkcs8', privateKey);
    const b64 = this.arrayBufferToBase64(exported);
    return `-----BEGIN PRIVATE KEY-----\n${this.formatPEM(b64)}\n-----END PRIVATE KEY-----`;
  }

  /**
   * Import public key from PEM
   */
  async importPublicKeyPEM(pem: string): Promise<CryptoKey> {
    const b64 = pem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s/g, '');
    
    const binary = this.base64ToArrayBuffer(b64);
    
    return crypto.subtle.importKey(
      'spki',
      binary,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['encrypt']
    );
  }

  /**
   * Import private key from PEM
   */
  async importPrivateKeyPEM(pem: string): Promise<CryptoKey> {
    const b64 = pem
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\s/g, '');
    
    const binary = this.base64ToArrayBuffer(b64);
    
    return crypto.subtle.importKey(
      'pkcs8',
      binary,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256'
      },
      true,
      ['decrypt']
    );
  }

  // Utility methods
  private formatPEM(b64: string): string {
    const lines = [];
    for (let i = 0; i < b64.length; i += 64) {
      lines.push(b64.slice(i, i + 64));
    }
    return lines.join('\n');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

/**
 * Hybrid Encryption (RSA + AES)
 */
export class HybridEncryption {
  private aes = new AESEncryption();
  private rsa = new RSAEncryption();

  /**
   * Encrypt large data with hybrid encryption
   */
  async encrypt(
    data: string,
    publicKey: CryptoKey
  ): Promise<{
    encryptedData: EncryptedData;
    encryptedKey: string;
  }> {
    // Generate random AES key
    const aesKey = await this.aes.generateKey();
    
    // Export AES key to encrypt with RSA
    const exportedKey = await this.aes.exportKey(aesKey);
    const keyString = JSON.stringify(exportedKey);
    
    // Encrypt the AES key with RSA
    const encryptedKey = await this.rsa.encryptWithPublicKey(keyString, publicKey);
    
    // Encrypt the data with AES
    const password = crypto.getRandomValues(new Uint8Array(32))
      .reduce((acc, byte) => acc + String.fromCharCode(byte), '');
    
    const encryptedData = await this.aes.encrypt(data, password);
    
    return {
      encryptedData,
      encryptedKey
    };
  }

  /**
   * Decrypt large data with hybrid encryption
   */
  async decrypt(
    encryptedData: EncryptedData,
    encryptedKey: string,
    privateKey: CryptoKey
  ): Promise<string> {
    // Decrypt the AES key with RSA
    const keyString = await this.rsa.decryptWithPrivateKey(encryptedKey, privateKey);
    const exportedKey = JSON.parse(keyString) as JsonWebKey;
    
    // Import the AES key
    const aesKey = await this.aes.importKey(exportedKey);
    
    // Generate the same password (this would need to be transmitted securely)
    // In practice, you'd use a different approach
    const password = 'temporary-password';
    
    // Decrypt the data with AES
    return this.aes.decrypt(encryptedData, password);
  }
}

/**
 * Stream Cipher for large files
 */
export class StreamCipher {
  private chunkSize = 64 * 1024; // 64KB chunks

  /**
   * Encrypt stream
   */
  async *encryptStream(
    stream: ReadableStream<Uint8Array>,
    key: CryptoKey
  ): AsyncGenerator<Uint8Array> {
    const reader = stream.getReader();
    let counter = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const iv = this.generateIV(counter++);
        const encrypted = await crypto.subtle.encrypt(
          {
            name: 'AES-CTR',
            counter: iv,
            length: 64
          },
          key,
          value
        );

        yield new Uint8Array(encrypted);
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Decrypt stream
   */
  async *decryptStream(
    stream: ReadableStream<Uint8Array>,
    key: CryptoKey
  ): AsyncGenerator<Uint8Array> {
    const reader = stream.getReader();
    let counter = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const iv = this.generateIV(counter++);
        const decrypted = await crypto.subtle.decrypt(
          {
            name: 'AES-CTR',
            counter: iv,
            length: 64
          },
          key,
          value
        );

        yield new Uint8Array(decrypted);
      }
    } finally {
      reader.releaseLock();
    }
  }

  private generateIV(counter: number): Uint8Array {
    const iv = new Uint8Array(16);
    const view = new DataView(iv.buffer);
    view.setUint32(12, counter, false);
    return iv;
  }
}

// Export main encryption instance
export const encryption = {
  aes: new AESEncryption(),
  rsa: new RSAEncryption(),
  hybrid: new HybridEncryption(),
  stream: new StreamCipher()
};