const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { TeamsService } = require('./dist/modules/teams/teams.service');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const teamsService = app.get(TeamsService);

  try {
    const callerId = '69ddb5eb6aa1b034ab27e67f'; // F1
    const targetUserId = '69e0621d92f5443f98cde89e'; // F2
    const res = await teamsService.getMyDashboard(callerId, targetUserId);
    console.log('Success:', res.stats);
  } catch (err) {
    console.error('Error:', err);
  }

  try {
    const callerId = '69ddb5eb6aa1b034ab27e67f'; // F1
    const targetUserId = '69e0621d92f5443f98cde89e'; // F2
    const res2 = await teamsService.getMyMembers(callerId, 1, 100, targetUserId);
    console.log('Success Members:', res2.members);
  } catch (err) {
    console.error('Error Members:', err);
  }

  await app.close();
  process.exit(0);
}
bootstrap();
