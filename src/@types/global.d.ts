declare module "*?url" {
  const path: string;
  export default path;
}

interface ImportMeta {
  hot: {
    accept: (newModule: unknown) => void;
    data: {
      alreadyInit?: boolean;
    };
  };
}
