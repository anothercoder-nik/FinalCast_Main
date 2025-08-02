# Cloud Storage Setup Guide for FinalCast Recording Service

This guide will help you configure cloud storage for your recording service. Choose the option that best fits your needs and budget.

## 🎯 Quick Recommendation

**For most users**: Use **Cloudinary** - it offers 25GB free storage and has built-in video processing capabilities.

## ☁️ Storage Provider Options

### 1. 🟢 Cloudinary (RECOMMENDED) - Free 25GB
**Best for**: Video optimization, automatic transcoding, generous free tier

**Setup Steps:**
1. Go to [Cloudinary.com](https://cloudinary.com/users/register/free)
2. Create a free account
3. Go to your Dashboard
4. Copy these values to your `.env` file:

```bash
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
```

**Features:**
- ✅ 25GB free storage
- ✅ 25GB free bandwidth/month
- ✅ Automatic video compression
- ✅ Multiple format support
- ✅ CDN included
- ✅ Video thumbnails
- ✅ Easy integration

---

### 2. 🟡 AWS S3 - Free 5GB
**Best for**: Enterprise features, fine-grained control

**Setup Steps:**
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Create an AWS account (requires credit card)
3. Go to IAM → Users → Create user
4. Attach policy: `AmazonS3FullAccess`
5. Create access keys
6. Go to S3 → Create bucket

```bash
STORAGE_PROVIDER=aws_s3
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=finalcast-recordings
```

**Features:**
- ✅ 5GB free storage
- ✅ 20,000 GET requests/month
- ✅ 2,000 PUT requests/month
- ✅ Enterprise-grade security
- ✅ Fine-grained permissions
- ❌ Requires credit card
- ❌ More complex setup

---

### 3. 🔵 Google Cloud Storage - Free 5GB
**Best for**: Google ecosystem integration

**Setup Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Cloud Storage API
4. Create a service account
5. Download the JSON key file

```bash
STORAGE_PROVIDER=google_cloud
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
GOOGLE_CLOUD_BUCKET_NAME=finalcast-recordings
```

---

### 4. 💾 Local Storage (Development Only)
**Best for**: Development, testing

```bash
STORAGE_PROVIDER=local
```

**Features:**
- ✅ No external dependencies
- ✅ Immediate setup
- ❌ Not suitable for production
- ❌ No redundancy
- ❌ Limited by server storage

## 🚀 Quick Start (5 minutes)

### Option A: Cloudinary (Recommended)

1. **Sign up for Cloudinary**:
   ```bash
   # Visit: https://cloudinary.com/users/register/free
   ```

2. **Update your `.env` file**:
   ```bash
   cp .env.example .env
   # Edit .env and add:
   STORAGE_PROVIDER=cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key  
   CLOUDINARY_API_SECRET=your_api_secret
   ```

3. **Install dependencies**:
   ```bash
   npm install
   ```

4. **Test the setup**:
   ```bash
   npm run dev
   ```

### Option B: AWS S3

1. **Create AWS Account**: [AWS Console](https://console.aws.amazon.com/)

2. **Create S3 Bucket**:
   - Go to S3 → Create bucket
   - Name: `finalcast-recordings-[your-name]`
   - Region: `us-east-1`
   - Block public access: Keep enabled
   - Create bucket

3. **Create IAM User**:
   - Go to IAM → Users → Create user
   - Username: `finalcast-recordings`
   - Attach policy: `AmazonS3FullAccess`
   - Create access key → Download CSV

4. **Update `.env` file**:
   ```bash
   STORAGE_PROVIDER=aws_s3
   AWS_ACCESS_KEY_ID=from_csv_file
   AWS_SECRET_ACCESS_KEY=from_csv_file
   AWS_REGION=us-east-1
   AWS_S3_BUCKET_NAME=finalcast-recordings-your-name
   ```

## 📊 Cost Comparison

| Provider | Free Tier | Cost After Free | Best For |
|----------|-----------|-----------------|----------|
| **Cloudinary** | 25GB storage<br>25GB bandwidth | $89/month for 75GB | Video processing |
| **AWS S3** | 5GB storage<br>20k GET, 2k PUT | $0.023/GB/month | Enterprise |
| **Google Cloud** | 5GB storage | $0.020/GB/month | Google ecosystem |
| **Local** | Limited by server | Server costs | Development |

## 🔧 Advanced Configuration

### Custom Upload Limits
```bash
# Maximum file size (500MB default)
MAX_RECORDING_FILE_SIZE=524288000

# Allowed formats
ALLOWED_RECORDING_FORMATS=video/mp4,video/webm,video/quicktime
```

### Auto-deletion
```bash
# Delete recordings after X days (0 = never)
RECORDING_RETENTION_DAYS=90
```

## 🧪 Testing Your Setup

1. **Start the server**:
   ```bash
   npm run dev
   ```

2. **Check storage configuration**:
   ```bash
   curl http://localhost:5000/api/recordings/config
   ```

3. **Test file upload** (via your frontend recording system)

## ❓ Troubleshooting

### Common Issues:

**"Storage provider not configured"**
- Check your `.env` file has the correct provider settings
- Restart your server after changing `.env`

**"AWS credentials not found"**
- Verify `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
- Check IAM user has S3 permissions

**"Cloudinary upload failed"**
- Verify your API credentials
- Check if you've exceeded free tier limits

**"File too large"**
- Increase `MAX_RECORDING_FILE_SIZE` in `.env`
- Check your cloud provider's file size limits

## 📚 Next Steps

1. **Choose your provider** (Cloudinary recommended)
2. **Update your `.env` file**
3. **Install dependencies**: `npm install`
4. **Test recording functionality**
5. **Monitor usage** in your cloud provider dashboard

## 🆘 Support

If you need help:
1. Check the console logs for error messages
2. Verify your environment variables
3. Test with a small file first
4. Check your cloud provider's status page

---

**Ready to record?** Choose your cloud provider and follow the setup steps above! 🎬
