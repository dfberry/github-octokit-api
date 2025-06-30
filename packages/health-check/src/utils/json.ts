export function flattenObjectValues(
  objArray: Array<Record<string, any>>,
  propertyName: string,
  includeEmpty: boolean = false
): string[] {
  try {
    // Ensure the input is a valid array of objects
    if (
      !Array.isArray(objArray) ||
      objArray.some(item => typeof item !== 'object' || item === null)
    ) {
      throw new Error('Input must be an array of non-null objects');
    }

    // Ensure the property name is valid
    if (typeof propertyName !== 'string' || propertyName.trim() === '') {
      throw new Error('Property name must be a non-empty string');
    }

    const values = objArray.map(item => {
      // Check if the property exists in the object
      if (item[propertyName] === undefined || item[propertyName] === null) {
        return ''; // Handle undefined or null values gracefully
      }
      return typeof item[propertyName] === 'string'
        ? item[propertyName]
        : String(item[propertyName]);
    });

    // Filter out empty values if includeEmpty is false
    return includeEmpty ? values : values.filter(val => val.trim() !== '');
  } catch (error: unknown) {
    // Type guard to check if error is an instance of Error
    if (error instanceof Error) {
      console.error('Error flattening object values:', error.message);
    } else {
      console.error('Unknown error occurred:', error);
    }
    return []; // Return an empty array in case of error
  }
}
