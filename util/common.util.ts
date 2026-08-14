export const uploadImageToCloudinary = async (
  file: File,
  onProgress?: (progress: number) => void
) => {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/dqgicjfnr/image/upload`,
      true
    );

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "e-shopping"); // Replace with your actual Cloudinary preset

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded * 100) / event.total);
        onProgress(progress);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        if (data.secure_url) {
          resolve(data.secure_url);
        } else {
          reject(new Error("No secure_url returned from Cloudinary"));
        }
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Image upload failed"));

    xhr.send(formData);
  });
};

