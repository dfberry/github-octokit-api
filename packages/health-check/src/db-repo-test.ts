import { GitHubContributorEntity, GitHubContributorService } from '@dfb/db';
import { DataSource, DataSourceOptions } from 'typeorm';

const connectionOptions: DataSourceOptions = {
  type: 'sqlite',
  database: './temp/sqlitedb-1.db',
  entities: [GitHubContributorEntity],
  synchronize: true,
};

async function init(connectionOptions) {
  const dataSource = new DataSource(connectionOptions);
  await dataSource.initialize();

  const contributorService = new GitHubContributorService(dataSource);

  return { dataSource, contributorService };
}

async function main() {
  const { dataSource, contributorService } = await init(connectionOptions);

  const data = await contributorService.getAll();

  console.log(data);

  await dataSource.destroy();
}

main().catch(error => {
  console.error('Error during data source initialization:', error);
});
