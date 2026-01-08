import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemSettings extends Document {
  key: string;
  value: any;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const SystemSettingsSchema = new Schema<ISystemSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    value: {
      type: Schema.Types.Mixed,
      required: true
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Helper para buscar configuração
SystemSettingsSchema.statics.getSetting = async function(key: string, defaultValue: any = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Helper para atualizar configuração
SystemSettingsSchema.statics.setSetting = async function(key: string, value: any, userId?: string) {
  return this.findOneAndUpdate(
    { key },
    { value, updatedBy: userId },
    { upsert: true, new: true }
  );
};

export default mongoose.model<ISystemSettings>('SystemSettings', SystemSettingsSchema);
