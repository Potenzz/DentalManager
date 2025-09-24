import { PdfFile, PdfGroup } from "@repo/db/types";
import { prisma as db } from "@repo/db/client";
import { PdfTitleKey } from "@repo/db/generated/prisma";

export interface IStorage {
  // General PDF Methods
  createPdfFile(
    groupId: number,
    filename: string,
    pdfData: Buffer
  ): Promise<PdfFile>;
  getPdfFileById(id: number): Promise<PdfFile | undefined>;
  getPdfFilesByGroupId(
    groupId: number,
    opts?: { limit?: number; offset?: number; withGroup?: boolean }
  ): Promise<PdfFile[] | { total: number; data: PdfFile[] }>;
  getRecentPdfFiles(limit: number, offset: number): Promise<PdfFile[]>;
  deletePdfFile(id: number): Promise<boolean>;
  updatePdfFile(
    id: number,
    updates: Partial<Pick<PdfFile, "filename" | "pdfData">>
  ): Promise<PdfFile | undefined>;

  // PDF Group management
  createPdfGroup(
    patientId: number,
    title: string,
    titleKey: PdfTitleKey
  ): Promise<PdfGroup>;
  findPdfGroupByPatientTitleKey(
    patientId: number,
    titleKey: PdfTitleKey
  ): Promise<PdfGroup | undefined>;
  getAllPdfGroups(): Promise<PdfGroup[]>;
  getPdfGroupById(id: number): Promise<PdfGroup | undefined>;
  getPdfGroupsByPatientId(patientId: number): Promise<PdfGroup[]>;
  updatePdfGroup(
    id: number,
    updates: Partial<Pick<PdfGroup, "title">>
  ): Promise<PdfGroup | undefined>;
  deletePdfGroup(id: number): Promise<boolean>;
}

export const generalPdfStorage: IStorage = {
  // PDF Files
  async createPdfFile(groupId, filename, pdfData) {
    return db.pdfFile.create({
      data: {
        groupId,
        filename,
        pdfData,
      },
    });
  },

  async getAllPdfGroups(): Promise<PdfGroup[]> {
    return db.pdfGroup.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  async getPdfFileById(id) {
    return (await db.pdfFile.findUnique({ where: { id } })) ?? undefined;
  },

  /**
   * getPdfFilesByGroupId: supports
   * - getPdfFilesByGroupId(groupId) => Promise<PdfFile[]>
   * - getPdfFilesByGroupId(groupId, { limit, offset }) => Promise<{ total, data }>
   * - getPdfFilesByGroupId(groupId, { limit, offset, withGroup: true }) => Promise<{ total, data: PdfFileWithGroup[] }>
   */
  async getPdfFilesByGroupId(groupId, opts) {
    // if pagination is requested (limit provided) return total + page
    const wantsPagination =
      !!opts &&
      (typeof opts.limit === "number" || typeof opts.offset === "number");

    if (wantsPagination) {
      const limit = Math.min(Number(opts?.limit ?? 5), 1000);
      const offset = Number(opts?.offset ?? 0);

      if (opts?.withGroup) {
        // return total + data with group included
        const [total, data] = await Promise.all([
          db.pdfFile.count({ where: { groupId } }),
          db.pdfFile.findMany({
            where: { groupId },
            orderBy: { uploadedAt: "desc" },
            take: limit,
            skip: offset,
            include: { group: true }, // only include
          }),
        ]);

        return { total, data };
      } else {
        // return total + data with limited fields via select
        const [total, data] = await Promise.all([
          db.pdfFile.count({ where: { groupId } }),
          db.pdfFile.findMany({
            where: { groupId },
            orderBy: { uploadedAt: "desc" },
            take: limit,
            skip: offset,
            select: { id: true, filename: true, uploadedAt: true }, // only select
          }),
        ]);

        // Note: selected shape won't have all PdfFile fields; cast if needed
        return { total, data: data as unknown as PdfFile[] };
      }
    }

    // non-paginated: return all files (keep descending order)
    if (opts?.withGroup) {
      const all = await db.pdfFile.findMany({
        where: { groupId },
        orderBy: { uploadedAt: "desc" },
        include: { group: true },
      });
      return all as PdfFile[];
    } else {
      const all = await db.pdfFile.findMany({
        where: { groupId },
        orderBy: { uploadedAt: "desc" },
        // no select or include -> returns full PdfFile
      });
      return all as PdfFile[];
    }
  },

  async getRecentPdfFiles(limit: number, offset: number): Promise<PdfFile[]> {
    return db.pdfFile.findMany({
      skip: offset,
      take: limit,
      orderBy: { uploadedAt: "desc" },
      include: { group: true },
    });
  },

  async updatePdfFile(id, updates) {
    try {
      return await db.pdfFile.update({
        where: { id },
        data: updates,
      });
    } catch {
      return undefined;
    }
  },

  async deletePdfFile(id) {
    try {
      await db.pdfFile.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },

  // ----------------------
  // PdfGroup CRUD
  // ----------------------

  async createPdfGroup(patientId, title, titleKey) {
    return db.pdfGroup.create({
      data: {
        patientId,
        title,
        titleKey,
      },
    });
  },

  async findPdfGroupByPatientTitleKey(patientId, titleKey) {
    return (
      (await db.pdfGroup.findFirst({
        where: {
          patientId,
          titleKey,
        },
      })) ?? undefined
    );
  },

  async getPdfGroupById(id) {
    return (await db.pdfGroup.findUnique({ where: { id } })) ?? undefined;
  },

  async getPdfGroupsByPatientId(patientId) {
    return db.pdfGroup.findMany({
      where: { patientId },
      orderBy: { createdAt: "desc" },
    });
  },

  async updatePdfGroup(id, updates) {
    try {
      return await db.pdfGroup.update({
        where: { id },
        data: updates,
      });
    } catch {
      return undefined;
    }
  },

  async deletePdfGroup(id) {
    try {
      await db.pdfGroup.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  },
};
