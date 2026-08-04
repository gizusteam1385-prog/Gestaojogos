import {
  pgTable,
  serial,
  varchar,
  numeric,
  integer,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core";

// Pessoas que participam nas raspadinhas
export const people = pgTable("people", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meses de raspadinhas
export const scratchMonths = pgTable("scratch_months", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  amountPerPerson: numeric("amount_per_person", { precision: 10, scale: 2 }).notNull().default("5.00"),
  existingFunds: numeric("existing_funds", { precision: 10, scale: 2 }).notNull().default("0.00"),
  winnings: numeric("winnings", { precision: 10, scale: 2 }).notNull().default("0.00"),
  playedAmount: numeric("played_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Pagamentos de raspadinhas por pessoa/mês
export const scratchPayments = pgTable("scratch_payments", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => people.id, { onDelete: "cascade" }),
  monthId: integer("month_id").notNull().references(() => scratchMonths.id, { onDelete: "cascade" }),
  paid: boolean("paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Raspadinhas - saldo inicial da caixa
export const scratchCaixaInitial = pgTable("scratch_caixa_initial", {
  id: serial("id").primaryKey(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
});

// Euromilhões - fundo geral
export const euroFund = pgTable("euro_fund", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'deposit' ou 'expense'
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Euromilhões - semanas
export const euroWeeks = pgTable("euro_weeks", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  ticketCost: numeric("ticket_cost", { precision: 10, scale: 2 }).notNull().default("2.50"),
  prize: numeric("prize", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
