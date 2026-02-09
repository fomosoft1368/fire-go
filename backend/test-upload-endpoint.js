const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api';

async function testVehicleConditionUpload() {
  try {
    console.log('� Step 1: Find test ride...');
    // Sử dụng ride ID từ database (thay bằng ID thực tế của bạn)
    const rideId = '698709f66cb38dc68007d711'; // Từ kết quả MongoDB query trước đó
    console.log('Using ride ID:', rideId);
    
    // Fake token for testing (backend JwtAuthGuard sẽ reject, nhưng ta test direct service)
    const token = 'test-token';

    console.log('\n📸 Step 3: Upload vehicle condition...');
    const testImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';

    const uploadRes = await fetch(`${API_URL}/rides/${rideId}/vehicle-condition/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phase: 'pre-trip',
        images: [testImage, testImage, testImage] // 3 test images
      })
    });

    if (!uploadRes.ok) {
      const error = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${error}`);
    }

    const uploadData = await uploadRes.json();
    console.log('✅ Upload successful!');
    console.log('Response:', JSON.stringify(uploadData, null, 2));

    console.log('\n🔍 Step 4: Verify in database...');
    const verifyRes = await fetch(`${API_URL}/rides/${rideId}/vehicle-condition`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const verifyData = await verifyRes.json();
    console.log('Database data:', JSON.stringify(verifyData, null, 2));

    if (verifyData.data?.preTrip?.completed) {
      console.log('\n✅ SUCCESS! Vehicle condition saved to database!');
      console.log(`   - PreTrip completed: ${verifyData.data.preTrip.completed}`);
      console.log(`   - Number of images: ${Object.keys(verifyData.data.preTrip.images || {}).length}`);
    } else {
      console.log('\n❌ FAILED! Data not saved correctly.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testVehicleConditionUpload();
