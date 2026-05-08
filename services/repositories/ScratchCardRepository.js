// Example usage of repository pattern for "scratchcard" entity

const BaseRepository = require('./BaseRepository');
const { v4: uuidv4 } = require('uuid');

class ScratchCardRepository extends BaseRepository {
  constructor() {
    super('scratchcard', 'scratchcard_Id');
  }

  async getScratchCardFromToken(token) {
    if (!token) return null;

    const scratchCards = await this.getAll({
      scratchcard_Token: token,
    });

    if (!scratchCards || scratchCards.length === 0) return null;
    return scratchCards[0];
  }

  async upsertScratchcard(mobile, amount, externalRef = null) {
    // Basic validation
    if (mobile === undefined || mobile === null || mobile === '') {
      throw new Error('mobile is required');
    }
    if (amount === undefined || amount === null || amount === '') {
      throw new Error('amount is required');
    }

    // 1) Try by externalRef (idempotent path)
    if (externalRef) {
      const byExt = await this.getAll({ scratchcard_ExternalRef: externalRef });
      if (byExt.length) {
        const row = byExt[0];

        // Only fill missing values; don't overwrite existing non-null values
        const patch = {};
        const hasMobile =
          row.scratchcard_Mobile !== undefined && row.scratchcard_Mobile !== null && row.scratchcard_Mobile !== '';
        const hasAmount = row.scratchcard_Amount !== undefined && row.scratchcard_Amount !== null;

        if (!hasMobile && mobile) patch.scratchcard_Mobile = mobile;
        if (!hasAmount && amount !== undefined && amount !== null) {
          patch.scratchcard_Amount = amount;
        }

        if (Object.keys(patch).length) {
          await this.update(row[this.idColumn], patch);
          return await this.getById(row[this.idColumn]);
        }
        return row; // final return: scratchcard
      }
    }

    // 2) Fallback: try existing by (mobile, amount)
    const existing = await this.getAll({
      scratchcard_Mobile: mobile,
      scratchcard_Amount: amount,
    });

    if (existing.length) {
      const row = existing[0];

      if (externalRef && !row.scratchcard_ExternalRef) {
        await this.update(row[this.idColumn], {
          scratchcard_ExternalRef: externalRef,
        });
        return await this.getById(row[this.idColumn]);
      }

      return row;
    }

    // 3) Insert new
    const token = uuidv4();
    const insertId = await this.create({
      scratchcard_Mobile: mobile,
      scratchcard_Amount: amount,
      scratchcard_ExternalRef: externalRef,
      scratchcard_Token: token,
    });

    const created = await this.getById(insertId);
    return created;
  }
}

module.exports = new ScratchCardRepository();
