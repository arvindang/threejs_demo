/**
 * MathUtils - Mathematical calculations and geometry utilities
 */
export class MathUtils {
  /**
   * Calculate explosion directions for model parts
   * Parts move along Z-axis based on their position relative to model center
   */
  static calculateExplosionDirections(model, parts) {
    if (!model || parts.length === 0) return;

    // Calculate model bounds and center
    const box = new THREE.Box3().setFromObject(model);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    // For z-axis explosion, parts move forward or backward based on their z-position relative to center
    parts.forEach((part, index) => {
      if (!part.userData.origin) return;
      
      // Get current world position of the part for direction calculation
      const worldPosition = new THREE.Vector3();
      part.getWorldPosition(worldPosition);
      
      // Determine direction along z-axis based on part's world z-position relative to center
      const partZ = worldPosition.z;
      const centerZ = center.z;
      
      let direction;
      if (partZ >= centerZ) {
        // Parts at or in front of center move forward (+z)
        direction = new THREE.Vector3(0, 0, 1);
      } else {
        // Parts behind center move backward (-z)  
        direction = new THREE.Vector3(0, 0, -1);
      }
      
      // Store the consistent direction in userData
      part.userData.explosionDirection = direction.clone();
    });

    console.log('Calculated z-axis explosion directions for', parts.length, 'parts');
  }

  /**
   * Calculate optimal camera distance for fitting an object
   */
  static calculateFitDistance(boundingBox, fov, paddingFactor = 1.4) {
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fovRadians = fov * (Math.PI / 180);
    let distance = maxDim / (2 * Math.tan(fovRadians / 2));
    
    // Add padding
    distance *= paddingFactor;
    
    // Ensure minimum distance
    distance = Math.max(distance, maxDim * 2);
    
    return distance;
  }

  /**
   * Calculate optimal camera position for viewing an object
   */
  static calculateCameraPosition(center, distance, direction = null) {
    // Default viewing direction (45 degrees from each axis)
    const defaultDirection = new THREE.Vector3(1, 1, 1).normalize();
    const viewDirection = direction || defaultDirection;
    
    return center.clone().add(viewDirection.multiplyScalar(distance));
  }

  /**
   * Calculate explosion offset for a part
   */
  static calculateExplosionOffset(part, modelCenter, maxDimension, explosionFactor) {
    if (!part.userData.explosionDirection) return new THREE.Vector3(0, 0, 0);
    
    // Base explosion distance scaled by model size
    const baseDistance = maxDimension * explosionFactor * 0.09;
    
    // Calculate explosion distance - parts further from center move more
    const partDistFromCenter = part.userData.origin.distanceTo(modelCenter);
    const distanceMultiplier = 1 + (partDistFromCenter / maxDimension) * 0.5;
    const explosionDistance = baseDistance * distanceMultiplier;
    
    // Return explosion offset using consistent direction
    return part.userData.explosionDirection.clone().multiplyScalar(explosionDistance);
  }

  /**
   * Calculate slice clipping plane position
   */
  static calculateSlicePosition(boundingBox, sliceDirection, sliceAmount) {
    const modelSize = boundingBox.getSize(new THREE.Vector3());

    // Get min/max values based on current slice direction
    let minValue, maxValue;
    switch (sliceDirection) {
      case 'x':
        minValue = boundingBox.min.x;
        maxValue = boundingBox.max.x;
        break;
      case 'y':
        minValue = boundingBox.min.y;
        maxValue = boundingBox.max.y;
        break;
      case 'z':
        minValue = boundingBox.min.z;
        maxValue = boundingBox.max.z;
        break;
      default:
        minValue = boundingBox.min.y;
        maxValue = boundingBox.max.y;
    }

    // Map slider value 0-1 to clipping range
    // slice = 0: clip everything (constant = minValue - buffer) 
    // slice = 1: show everything (constant = maxValue + buffer)
    const buffer = Math.max(modelSize.x, modelSize.y, modelSize.z) * 0.1; // Buffer based on largest dimension
    const clippingRange = (maxValue + buffer) - (minValue - buffer);
    return (minValue - buffer) + (sliceAmount * clippingRange);
  }

  /**
   * Get clipping plane normal vector for slice direction
   */
  static getSliceNormal(sliceDirection) {
    switch (sliceDirection) {
      case 'x':
        return new THREE.Vector3(-1, 0, 0); // Slice along X axis (left to right)
      case 'y':
        return new THREE.Vector3(0, -1, 0); // Slice along Y axis (bottom to top)
      case 'z':
        return new THREE.Vector3(0, 0, -1); // Slice along Z axis (front to back)
      default:
        return new THREE.Vector3(0, -1, 0); // Default to Y axis
    }
  }

  /**
   * Calculate bounding box for multiple objects
   */
  static calculateMultiObjectBounds(objects) {
    if (!objects || objects.length === 0) return null;
    
    const box = new THREE.Box3();
    objects.forEach(obj => {
      if (obj.geometry || obj.children.length > 0) {
        box.expandByObject(obj);
      }
    });
    
    return box.isEmpty() ? null : box;
  }

  /**
   * Linear interpolation between two values
   */
  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  /**
   * Clamp a value between min and max
   */
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Map a value from one range to another
   */
  static mapRange(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
  }

  /**
   * Calculate distance between two Vector3 points
   */
  static distance(point1, point2) {
    return point1.distanceTo(point2);
  }

  /**
   * Calculate the center point between two Vector3 points
   */
  static midpoint(point1, point2) {
    return point1.clone().add(point2).multiplyScalar(0.5);
  }

  /**
   * Normalize a value to 0-1 range based on min/max bounds
   */
  static normalize(value, min, max) {
    return (value - min) / (max - min);
  }
} 