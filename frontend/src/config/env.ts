const env = {
  apiUrl: import.meta.env.VITE_API_URL as string,
};

if (!env.apiUrl) {
  throw new Error('VITE_API_URL is not defined');
}

export default env;
