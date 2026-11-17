/** Preserve original row identity across the historical engine side sort. */
export const unsortedPath = (path: string): string => path.replace(/^src\/(?:client|cook|server|shared)\/(engine|game)\//u, 'src/$1/').replace(/^src\/sharddev\//u, 'src/sdk/');
