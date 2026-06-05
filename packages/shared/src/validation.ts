const SCRIPT_TYPES = ['ugc', 'review', 'before_after', 'pov', 'problem_solution'] as const;
const LANGUAGES = ['en', 'ms', 'th', 'fil', 'es'] as const;
const COUNTRIES = ['US', 'MY', 'SG', 'TH', 'PH'] as const;

export function validateProduct(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.name || typeof data.name !== 'string') errors.push('name is required');
  if (data.price && typeof data.price !== 'string') errors.push('price must be string');
  if (data.category && typeof data.category !== 'string') errors.push('category must be string');
  return { valid: errors.length === 0, errors };
}

export function validateScript(data: Record<string, unknown>) {
  const errors: string[] = [];
  if (!data.productId) errors.push('productId is required');
  if (!data.scriptType || !SCRIPT_TYPES.includes(data.scriptType as any)) {
    errors.push(`scriptType must be one of: ${SCRIPT_TYPES.join(', ')}`);
  }
  return { valid: errors.length === 0, errors };
}

export { SCRIPT_TYPES, LANGUAGES, COUNTRIES };
