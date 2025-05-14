import { User } from "@repo/db/client"; 

declare global {
  namespace Express {
    interface User {
      id: number;
      // include any other properties 
    }
  }
}
