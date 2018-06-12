// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  apiUrl: '/api/v1.0',
  accessTokenCookieName: 'access_token',
  tileSize: 512,
  upperPercentileDefault: 99.95,
  lowerPercentileDefault: 10,
};
