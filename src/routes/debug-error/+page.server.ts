import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Simulasi error tak terduga — ini akan melempar Error dan harus memicu +error.svelte
  throw new Error('yahooo!!');
};
