import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { connectDB } from '../config/database';
import { User } from '../models/User';
import { Bank } from '../models/Bank';
import { Program } from '../models/Program';
import { Vendor } from '../models/Vendor';
import { ENV } from '../config/environment';

const BANKS = [
  { name: 'HDFC Life', code: 'HDFC-LIFE' },
  { name: 'HDFC Future Bank', code: 'HDFC-FB' },
  { name: 'Axis Operations', code: 'AXIS-OPS' },
  { name: 'Axis Retail Lending', code: 'AXIS-RL' },
  { name: 'IDFC Emerging', code: 'IDFC-EM' },
  { name: 'IDFC Elevate', code: 'IDFC-EL' },
  { name: 'Aditya Birla Direct Marketing', code: 'AB-DM' },
  { name: 'Aditya Birla Banca', code: 'AB-BANCA' },
  { name: 'Tata AIG', code: 'TATA-AIG' },
  { name: 'Axis Gold Loan', code: 'AXIS-GL' },
];

const VENDORS = [
  { name: 'Manipal', code: 'MANIPAL', contactPerson: 'Manipal Admin', notes: 'Primary placement vendor' },
  { name: 'Crack-ed', code: 'CRACKED', contactPerson: 'Crack-ed Admin', notes: 'Secondary placement vendor' },
];

const DEFAULT_ROUNDS = [
  { roundId: 'r_l1', roundName: 'L1', isMandatory: true, order: 1, defaultMode: 'Online' },
  { roundId: 'r_l2', roundName: 'L2', isMandatory: true, order: 2, defaultMode: 'Online' },
  { roundId: 'r_mock', roundName: 'Mock', isMandatory: false, order: 3, defaultMode: 'Online' },
];

const SUPER_ADMIN = {
  employeeId: 'FIC-SA-001',
  name: 'Super Admin (MD)',
  email: 'admin@forgeindia.com',
  password: 'FIC@Admin2026',
  role: 'SUPER_ADMIN' as const,
  phone: '9999999999',
};

const seed = async () => {
  try {
    console.log('\n🌱 Starting FIC CRM Database Seed...');
    await connectDB();

    // ---- Banks ----
    console.log('\n📦 Seeding Banks...');
    for (const b of BANKS) {
      await Bank.findOneAndUpdate(
        { code: b.code },
        { $setOnInsert: { ...b, status: 'ACTIVE' } },
        { upsert: true, new: true }
      );
      console.log(`  ✅ Bank: ${b.name}`);
    }

    // ---- Vendors ----
    console.log('\n📦 Seeding Vendors...');
    for (const v of VENDORS) {
      await Vendor.findOneAndUpdate(
        { code: v.code },
        { $setOnInsert: { ...v, status: 'ACTIVE' } },
        { upsert: true, new: true }
      );
      console.log(`  ✅ Vendor: ${v.name}`);
    }

    // ---- Programs (one per bank) ----
    console.log('\n📦 Seeding Programs...');
    const banks = await Bank.find({ status: 'ACTIVE' });

    const programDefs: Array<{ bankCode: string; name: string; code: string; designation: string; fee: number }> = [
      { bankCode: 'HDFC-LIFE', name: 'HDFC Life Advisor Program', code: 'HDFC-LIFE-AP', designation: 'Sales Advisor', fee: 25000 },
      { bankCode: 'HDFC-FB', name: 'HDFC Future Bank Trainee', code: 'HDFC-FB-T', designation: 'Banking Trainee', fee: 20000 },
      { bankCode: 'AXIS-OPS', name: 'Axis Operations Executive', code: 'AXIS-OPS-EX', designation: 'Operations Executive', fee: 18000 },
      { bankCode: 'AXIS-RL', name: 'Axis Retail Lending Officer', code: 'AXIS-RL-OF', designation: 'Lending Officer', fee: 22000 },
      { bankCode: 'IDFC-EM', name: 'IDFC Emerging Leaders', code: 'IDFC-EM-L', designation: 'Banking Associate', fee: 20000 },
      { bankCode: 'IDFC-EL', name: 'IDFC Elevate Program', code: 'IDFC-EL-P', designation: 'Senior Associate', fee: 25000 },
      { bankCode: 'AB-DM', name: 'Aditya Birla DM Executive', code: 'AB-DM-EX', designation: 'DM Executive', fee: 15000 },
      { bankCode: 'AB-BANCA', name: 'Aditya Birla Banca Officer', code: 'AB-BANCA-OF', designation: 'Banca Officer', fee: 18000 },
      { bankCode: 'TATA-AIG', name: 'Tata AIG Insurance Advisor', code: 'TATA-AIG-IA', designation: 'Insurance Advisor', fee: 15000 },
      { bankCode: 'AXIS-GL', name: 'Axis Gold Loan Officer', code: 'AXIS-GL-OF', designation: 'Gold Loan Officer', fee: 18000 },
    ];

    for (const pd of programDefs) {
      const bank = banks.find((b) => b.code === pd.bankCode);
      if (!bank) continue;

      await Program.findOneAndUpdate(
        { code: pd.code },
        {
          $setOnInsert: {
            bankId: bank._id,
            bankName: bank.name,
            name: pd.name,
            code: pd.code,
            designation: pd.designation,
            vendorAvailability: ['Manipal', 'Crack-ed'],
            interviewRoundsConfig: DEFAULT_ROUNDS,
            enrollmentFeeAmount: pd.fee,
            paymentTrigger: 'AFTER_SELECTION',
            isRefundable: true,
            loanAvailable: true,
            campusApplicable: true,
            status: 'ACTIVE',
          },
        },
        { upsert: true, new: true }
      );
      console.log(`  ✅ Program: ${pd.name}`);
    }

    // ---- Super Admin User ----
    console.log('\n👤 Seeding Super Admin...');
    const existing = await User.findOne({ email: SUPER_ADMIN.email });
    if (!existing) {
      const salt = await bcrypt.genSalt(ENV.BCRYPT_ROUNDS);
      const passwordHash = await bcrypt.hash(SUPER_ADMIN.password, salt);

      await User.create({
        employeeId: SUPER_ADMIN.employeeId,
        name: SUPER_ADMIN.name,
        email: SUPER_ADMIN.email,
        passwordHash,
        phone: SUPER_ADMIN.phone,
        role: SUPER_ADMIN.role,
        status: 'ACTIVE',
      });
      console.log(`  ✅ Super Admin created: ${SUPER_ADMIN.email} / ${SUPER_ADMIN.password}`);
    } else {
      console.log(`  ℹ️  Super Admin already exists: ${SUPER_ADMIN.email}`);
    }

    console.log('\n🎉 FIC CRM Database Seed Complete!\n');
    console.log('🔑 Default Login:');
    console.log(`   Email    : ${SUPER_ADMIN.email}`);
    console.log(`   Password : ${SUPER_ADMIN.password}\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seed();

