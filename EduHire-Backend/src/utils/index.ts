import mongoose from 'mongoose';

export function getObjectId(
  id: string | mongoose.Types.ObjectId,
): mongoose.Types.ObjectId {
  return id instanceof mongoose.Types.ObjectId
    ? id
    : new mongoose.Types.ObjectId(id);
}
