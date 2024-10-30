import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }

  // Example: Mocked balance retrieval (replace with actual balance fetching logic)
  const balance = "100"; // Replace this with actual balance fetching code

  return res.status(200).json({ balance });
}
