import { prisma } from "@/lib/prisma";
import {
  AuthenticationState,
  AuthenticationCreds,
  SignalDataTypeMap,
  SignalDataSet,
  initAuthCreds,
  makeCacheableSignalKeyStore,
  BufferJSON,
} from "@whiskeysockets/baileys";

function makeCredKey(userId: string, deviceId: string): string {
  return `${userId}_${deviceId}`;
}

async function readCreds(userId: string, deviceId: string): Promise<AuthenticationCreds | null> {
  const row = await prisma.baileysAuthCred.findUnique({
    where: {
      userId_deviceId_category_keyId: {
        userId,
        deviceId,
        category: "creds",
        keyId: "__main__",
      },
    },
  });
  if (!row) return null;
  return JSON.parse(row.data, BufferJSON.reviver) as AuthenticationCreds;
}

async function writeCreds(userId: string, deviceId: string, creds: AuthenticationCreds): Promise<void> {
  await prisma.baileysAuthCred.upsert({
    where: {
      userId_deviceId_category_keyId: {
        userId,
        deviceId,
        category: "creds",
        keyId: "__main__",
      },
    },
    create: {
      userId,
      deviceId,
      category: "creds",
      keyId: "__main__",
      data: JSON.stringify(creds, BufferJSON.replacer),
    },
    update: {
      data: JSON.stringify(creds, BufferJSON.replacer),
    },
  });
}

export async function usePrismaAuthState(
  userId: string,
  deviceId: string = "main",
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const key = makeCredKey(userId, deviceId);

  const creds = (await readCreds(userId, deviceId)) || initAuthCreds();

  const rawStore: import("@whiskeysockets/baileys").SignalKeyStore = {
    get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
      const rows = await prisma.baileysAuthCred.findMany({
        where: {
          userId,
          deviceId,
          category: type,
          keyId: { in: ids },
        },
      });

      const data: { [id: string]: SignalDataTypeMap[T] } = {};
      for (const row of rows) {
        if (row.keyId) {
          data[row.keyId] = JSON.parse(row.data, BufferJSON.reviver) as SignalDataTypeMap[T];
        }
      }

      return data;
    },

    set: async (data: SignalDataSet): Promise<void> => {
      const operations: Promise<any>[] = [];

      for (const category in data) {
        const entries = data[category as keyof SignalDataSet];
        if (!entries) continue;

        for (const id in entries) {
          const value = entries[id];

          if (value === null || value === undefined) {
            operations.push(
              prisma.baileysAuthCred.deleteMany({
                where: {
                  userId,
                  deviceId,
                  category,
                  keyId: id,
                },
              })
            );
          } else {
            const serialized = JSON.stringify(value, BufferJSON.replacer);
            operations.push(
              prisma.baileysAuthCred.upsert({
                where: {
                  userId_deviceId_category_keyId: {
                    userId,
                    deviceId,
                    category,
                    keyId: id,
                  },
                },
                create: {
                  userId,
                  deviceId,
                  category,
                  keyId: id,
                  data: serialized,
                },
                update: {
                  data: serialized,
                },
              })
            );
          }
        }
      }

      await Promise.all(operations);
    },
  };

  const keys = makeCacheableSignalKeyStore(rawStore);

  return {
    state: { creds, keys },
    saveCreds: async () => {
      await writeCreds(userId, deviceId, creds);
    },
  };
}
