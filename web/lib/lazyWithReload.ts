import { lazy, type ComponentType } from 'react';

const RELOAD_FLAG = 'pp_chunk_reload';

/**
 * React.lazy that survives deploys. A new deploy replaces the hashed code chunks, so a tab
 * opened before the deploy can fail to fetch them; reload once to pick up the new build.
 */
export function lazyWithReload<T extends ComponentType<any>>(load: () => Promise<{ default: T }>) {
  return lazy(() =>
    load()
      .then((module) => {
        sessionStorage.removeItem(RELOAD_FLAG);
        return module;
      })
      .catch((error) => {
        if (!sessionStorage.getItem(RELOAD_FLAG)) {
          sessionStorage.setItem(RELOAD_FLAG, '1');
          window.location.reload();
          return new Promise<never>(() => {});
        }
        sessionStorage.removeItem(RELOAD_FLAG);
        throw error;
      })
  );
}
