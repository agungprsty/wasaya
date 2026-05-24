import { Pool } from 'pg'
import type { QueryResultRow } from 'pg'

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT || '5432', 10),
  database: process.env.PGDATABASE || 'whatsapp_gateway',
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
})

pool.on('error', (err) => {
  console.error('Unexpected DB pool error:', err)
})

interface QueryOptions {
  where?: string
  params?: unknown[]
  order?: string
  limit?: number
}

function escapeIdent(ident: string): string {
  return '"' + ident.replace(/"/g, '""') + '"'
}

export const pg = {
  query: <T extends QueryResultRow>(text: string, params?: unknown[]) =>
    pool.query<T>(text, params),

  get: async <T extends QueryResultRow>(
    table: string,
    options?: QueryOptions
  ): Promise<T[]> => {
    let sql = `SELECT * FROM ${escapeIdent(table)}`
    if (options?.where) {
      sql += ` WHERE ${options.where}`
    }
    if (options?.order) {
      sql += ` ORDER BY ${options.order}`
    }
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`
    }
    const { rows } = await pool.query<T>(sql, options?.params || [])
    return rows
  },

  findById: async <T extends QueryResultRow>(
    table: string,
    id: string
  ): Promise<T | null> => {
    const { rows } = await pool.query<T>(
      `SELECT * FROM ${escapeIdent(table)} WHERE id = $1 LIMIT 1`,
      [id]
    )
    return rows[0] || null
  },

  findByColumn: async <T extends QueryResultRow>(
    table: string,
    column: string,
    value: string
  ): Promise<T | null> => {
    const { rows } = await pool.query<T>(
      `SELECT * FROM ${escapeIdent(table)} WHERE ${escapeIdent(column)} = $1 LIMIT 1`,
      [value]
    )
    return rows[0] || null
  },

  create: async <T extends QueryResultRow>(
    table: string,
    data: Record<string, unknown>
  ): Promise<T> => {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map((_, i) => `$${i + 1}`)
    const { rows } = await pool.query<T>(
      `INSERT INTO ${escapeIdent(table)} (${keys.map(escapeIdent).join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    )
    return rows[0] as T
  },

  update: async <T extends QueryResultRow>(
    table: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<T | null> => {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((k, i) => `${escapeIdent(k)} = $${i + 1}`).join(', ')
    const { rows } = await pool.query<T>(
      `UPDATE ${escapeIdent(table)} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    )
    return rows[0] || null
  },

  updateByColumn: async <T extends QueryResultRow>(
    table: string,
    column: string,
    value: string,
    data: Record<string, unknown>
  ): Promise<T | null> => {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const setClause = keys.map((k, i) => `${escapeIdent(k)} = $${i + 1}`).join(', ')
    const { rows } = await pool.query<T>(
      `UPDATE ${escapeIdent(table)} SET ${setClause} WHERE ${escapeIdent(column)} = $${keys.length + 1} RETURNING *`,
      [...values, value]
    )
    return rows[0] || null
  },
}
