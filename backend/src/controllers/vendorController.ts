import { Request, Response } from 'express';
import { Vendor } from '../models/Vendor';
import { Application } from '../models/Application';
import { sendSuccess, sendError } from '../utils/response';
import { logActivity } from '../utils/auditLogger';

export const getVendors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    const vendors = await Vendor.find(filter).sort({ name: 1 }).lean();

    // Aggregate candidate/application counts per vendor
    const counts = await Application.aggregate([
      { $group: { _id: '$vendorName', count: { $sum: 1 } } },
    ]);

    const countMap: Record<string, number> = {};
    counts.forEach((c) => {
      if (c._id) countMap[c._id] = c.count;
    });

    const vendorsWithCounts = vendors.map((v) => ({
      ...v,
      candidateCount: countMap[v.name] || 0,
    }));

    sendSuccess(res, vendorsWithCounts, 'Vendors retrieved successfully.');
  } catch (error) {
    sendError(res, 'Failed to fetch vendors.', 500);
  }
};

export const createVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code, contactPerson, email, phone, notes, status } = req.body;
    if (!name || !code) {
      sendError(res, 'Vendor Name and Code are required.', 400);
      return;
    }

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();

    const existing = await Vendor.findOne({
      $or: [{ name: cleanName }, { code: cleanCode }],
    });
    if (existing) {
      sendError(res, 'A vendor with this name or code already exists.', 409);
      return;
    }

    const vendor = await Vendor.create({
      name: cleanName,
      code: cleanCode,
      contactPerson: contactPerson?.trim(),
      email: email?.trim().toLowerCase(),
      phone: phone?.trim(),
      notes: notes?.trim(),
      status: status || 'ACTIVE',
    });

    await logActivity({
      req,
      action: 'VENDOR_CREATED',
      entityType: 'MASTER_DATA',
      entityId: vendor._id.toString(),
      details: `Created vendor ${vendor.name} (${vendor.code})`,
      newState: { name: vendor.name, code: vendor.code },
    });

    sendSuccess(res, vendor, 'Vendor created successfully.', 201);
  } catch (error) {
    sendError(res, 'Failed to create vendor.', 500);
  }
};

export const updateVendor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, contactPerson, email, phone, notes, status } = req.body;

    const vendor = await Vendor.findById(id);
    if (!vendor) {
      sendError(res, 'Vendor not found.', 404);
      return;
    }

    const prev = { name: vendor.name, status: vendor.status };

    if (name) vendor.name = name.trim();
    if (contactPerson !== undefined) vendor.contactPerson = contactPerson.trim();
    if (email !== undefined) vendor.email = email.trim().toLowerCase();
    if (phone !== undefined) vendor.phone = phone.trim();
    if (notes !== undefined) vendor.notes = notes.trim();
    if (status) vendor.status = status;

    await vendor.save();

    await logActivity({
      req,
      action: 'VENDOR_UPDATED',
      entityType: 'MASTER_DATA',
      entityId: vendor._id.toString(),
      previousState: prev,
      newState: { name: vendor.name, status: vendor.status },
      details: `Updated vendor ${vendor.name}`,
    });

    sendSuccess(res, vendor, 'Vendor updated successfully.');
  } catch (error) {
    sendError(res, 'Failed to update vendor.', 500);
  }
};

export const toggleVendorStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const vendor = await Vendor.findById(id);
    if (!vendor) {
      sendError(res, 'Vendor not found.', 404);
      return;
    }

    const oldStatus = vendor.status;
    vendor.status = vendor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    await vendor.save();

    await logActivity({
      req,
      action: 'VENDOR_STATUS_TOGGLED',
      entityType: 'MASTER_DATA',
      entityId: vendor._id.toString(),
      details: `Changed vendor ${vendor.name} status from ${oldStatus} to ${vendor.status}`,
    });

    sendSuccess(res, vendor, `Vendor marked as ${vendor.status}.`);
  } catch (error) {
    sendError(res, 'Failed to update vendor status.', 500);
  }
};

