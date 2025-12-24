import app, { ready } from "../server/src/index";

export default async function handler(req: any, res: any) {
  // Ensure defaults (like weekly availability windows) exist before handling requests.
  await ready;
  return app(req, res);
}


