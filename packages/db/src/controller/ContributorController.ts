import Contributor from '../entity/Contributor.js';
import { Repository /*, InsertResult*/ } from 'typeorm';

export const insertBatch = (
  repo: Repository<Contributor>,
  data: Partial<Contributor>[]
) => {
  if (!data.length) return null;
  if (!repo) {
    throw new Error('Repository is not provided');
  }
  return repo.insert(data);
};
/*
export const getById = (repo: Repository<Contributor>, id: string): Promise<Contributor | null> => {
        if (!id) return null;
        if (!repo) {
            throw new Error('Repository is not provided');
        }
        return repo.findOneBy({ id });
    }
    static async getAll(repo: Repository<Contributor>): Promise<Contributor[]> {
        if (!repo) {
            throw new Error('Repository is not provided');
        }
        return repo.find();
    }
};
*/
