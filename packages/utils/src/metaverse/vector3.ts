/**
 * 3D Vector Mathematics for Metaverse
 * High-performance vector operations for WebXR and 3D applications
 */

export class Vector3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  /**
   * Set vector components
   */
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  /**
   * Copy from another vector
   */
  copy(v: Vector3): this {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }

  /**
   * Clone this vector
   */
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Add vectors
   */
  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  /**
   * Add scalar to all components
   */
  addScalar(s: number): this {
    this.x += s;
    this.y += s;
    this.z += s;
    return this;
  }

  /**
   * Subtract vectors
   */
  sub(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  /**
   * Multiply by vector (component-wise)
   */
  multiply(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  /**
   * Multiply by scalar
   */
  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }

  /**
   * Divide by vector (component-wise)
   */
  divide(v: Vector3): this {
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }

  /**
   * Divide by scalar
   */
  divideScalar(s: number): this {
    return this.multiplyScalar(1 / s);
  }

  /**
   * Calculate dot product
   */
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  /**
   * Calculate cross product
   */
  cross(v: Vector3): this {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;
    
    this.x = x;
    this.y = y;
    this.z = z;
    
    return this;
  }

  /**
   * Calculate length (magnitude)
   */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  /**
   * Calculate squared length (faster than length)
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  /**
   * Normalize vector (make unit length)
   */
  normalize(): this {
    const length = this.length();
    if (length === 0) {
      this.x = this.y = this.z = 0;
    } else {
      this.divideScalar(length);
    }
    return this;
  }

  /**
   * Set length to specific value
   */
  setLength(length: number): this {
    return this.normalize().multiplyScalar(length);
  }

  /**
   * Calculate distance to another vector
   */
  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  /**
   * Calculate squared distance (faster)
   */
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return dx * dx + dy * dy + dz * dz;
  }

  /**
   * Linear interpolation to another vector
   */
  lerp(v: Vector3, alpha: number): this {
    this.x += (v.x - this.x) * alpha;
    this.y += (v.y - this.y) * alpha;
    this.z += (v.z - this.z) * alpha;
    return this;
  }

  /**
   * Spherical linear interpolation
   */
  slerp(v: Vector3, alpha: number): this {
    const dot = this.dot(v);
    const theta = Math.acos(Math.min(Math.abs(dot), 1)) * alpha;
    const relative = v.clone().sub(this.clone().multiplyScalar(dot)).normalize();
    
    return this.multiplyScalar(Math.cos(theta)).add(relative.multiplyScalar(Math.sin(theta)));
  }

  /**
   * Reflect vector off a plane defined by normal
   */
  reflect(normal: Vector3): this {
    const dot2 = this.dot(normal) * 2;
    return this.sub(normal.clone().multiplyScalar(dot2));
  }

  /**
   * Project vector onto another vector
   */
  projectOnVector(v: Vector3): this {
    const denominator = v.lengthSq();
    if (denominator === 0) return this.set(0, 0, 0);
    
    const scalar = v.dot(this) / denominator;
    return this.copy(v).multiplyScalar(scalar);
  }

  /**
   * Project vector onto plane defined by normal
   */
  projectOnPlane(planeNormal: Vector3): this {
    const v1 = this.clone();
    v1.projectOnVector(planeNormal);
    return this.sub(v1);
  }

  /**
   * Check if vectors are equal
   */
  equals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  /**
   * Check if vectors are approximately equal
   */
  equalsEpsilon(v: Vector3, epsilon = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) < epsilon &&
      Math.abs(this.y - v.y) < epsilon &&
      Math.abs(this.z - v.z) < epsilon
    );
  }

  /**
   * Clamp vector components between min and max
   */
  clamp(min: Vector3, max: Vector3): this {
    this.x = Math.max(min.x, Math.min(max.x, this.x));
    this.y = Math.max(min.y, Math.min(max.y, this.y));
    this.z = Math.max(min.z, Math.min(max.z, this.z));
    return this;
  }

  /**
   * Clamp vector length
   */
  clampLength(min: number, max: number): this {
    const length = this.length();
    return this.divideScalar(length || 1).multiplyScalar(
      Math.max(min, Math.min(max, length))
    );
  }

  /**
   * Apply matrix transformation
   */
  applyMatrix4(m: number[]): this {
    const x = this.x, y = this.y, z = this.z;
    const w = 1 / (m[3] * x + m[7] * y + m[11] * z + m[15]);
    
    this.x = (m[0] * x + m[4] * y + m[8] * z + m[12]) * w;
    this.y = (m[1] * x + m[5] * y + m[9] * z + m[13]) * w;
    this.z = (m[2] * x + m[6] * y + m[10] * z + m[14]) * w;
    
    return this;
  }

  /**
   * Apply quaternion rotation
   */
  applyQuaternion(q: { x: number; y: number; z: number; w: number }): this {
    const x = this.x, y = this.y, z = this.z;
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    
    // Calculate quat * vector
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;
    
    // Calculate result * inverse quat
    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
    
    return this;
  }

  /**
   * Convert to array
   */
  toArray(array: number[] = [], offset = 0): number[] {
    array[offset] = this.x;
    array[offset + 1] = this.y;
    array[offset + 2] = this.z;
    return array;
  }

  /**
   * Set from array
   */
  fromArray(array: number[], offset = 0): this {
    this.x = array[offset];
    this.y = array[offset + 1];
    this.z = array[offset + 2];
    return this;
  }

  /**
   * Convert to string
   */
  toString(): string {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  /**
   * Get component by index
   */
  getComponent(index: number): number {
    switch (index) {
      case 0: return this.x;
      case 1: return this.y;
      case 2: return this.z;
      default: throw new Error(`Index ${index} out of range`);
    }
  }

  /**
   * Set component by index
   */
  setComponent(index: number, value: number): this {
    switch (index) {
      case 0: this.x = value; break;
      case 1: this.y = value; break;
      case 2: this.z = value; break;
      default: throw new Error(`Index ${index} out of range`);
    }
    return this;
  }

  // Static methods

  /**
   * Add two vectors
   */
  static add(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  /**
   * Subtract two vectors
   */
  static sub(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  /**
   * Cross product of two vectors
   */
  static cross(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  /**
   * Dot product of two vectors
   */
  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  /**
   * Linear interpolation between two vectors
   */
  static lerp(a: Vector3, b: Vector3, alpha: number): Vector3 {
    return new Vector3(
      a.x + (b.x - a.x) * alpha,
      a.y + (b.y - a.y) * alpha,
      a.z + (b.z - a.z) * alpha
    );
  }

  /**
   * Distance between two vectors
   */
  static distance(a: Vector3, b: Vector3): number {
    return Math.sqrt(
      (a.x - b.x) ** 2 +
      (a.y - b.y) ** 2 +
      (a.z - b.z) ** 2
    );
  }

  /**
   * Angle between two vectors
   */
  static angle(a: Vector3, b: Vector3): number {
    const denominator = Math.sqrt(a.lengthSq() * b.lengthSq());
    if (denominator === 0) return Math.PI / 2;
    
    const theta = Vector3.dot(a, b) / denominator;
    return Math.acos(Math.min(Math.max(theta, -1), 1));
  }

  // Common vector constants
  static readonly ZERO = new Vector3(0, 0, 0);
  static readonly ONE = new Vector3(1, 1, 1);
  static readonly UP = new Vector3(0, 1, 0);
  static readonly DOWN = new Vector3(0, -1, 0);
  static readonly LEFT = new Vector3(-1, 0, 0);
  static readonly RIGHT = new Vector3(1, 0, 0);
  static readonly FORWARD = new Vector3(0, 0, -1);
  static readonly BACK = new Vector3(0, 0, 1);
}