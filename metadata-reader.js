const { default: EXIF } = require("exif-js");

document.getElementById("fileInput").addEventListener("change", async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const output = document.getElementById("output");
    output.innerHTML = "Reading files...";

    const selectedExifData = [];

    for (const file of files) {
        if (!file.type.includes('jpeg') && !file.type.includes('jpg')) {
            console.warn(`Skipping ${file.name}: Not a JPEG file`);
            continue;
        }

        const exifData = await new Promise((resolve) => {
            EXIF.getData(file, function() {
                const rawMetadata = EXIF.getAllTags(this);
                
                console.log("==> ",rawMetadata);
                
                const withoutMakerNote = Object.entries(rawMetadata)
                    .filter(([key]) => key !== 'MakerNote' && key !== 'UserComment')
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});
                
                const selectedData = {
                    fileName: file.name,
                    iso: withoutMakerNote.ISOSpeedRatings ?? 'No data',
                    gps: {
                        longitude: withoutMakerNote.GPSLongitude ?? 'No data',
                        latitude: withoutMakerNote.GPSLatitude ?? 'No data'
                    },
                    camera: {
                        make: withoutMakerNote.Make ?? 'No data',
                        model: withoutMakerNote.Model ?? 'No data'
                    },
                    aperture: {
                        value: withoutMakerNote.ApertureValue ?? 'No data',
                        maxValue: withoutMakerNote.MaxApertureValue ?? 'No data'
                    },
                    exposure: {
                        time: withoutMakerNote.ExposureTime ?? 'No data',
                        program: withoutMakerNote.ExposureProgram ?? 'No data',
                        bias: withoutMakerNote.ExposureBias ?? 'No data',
                        mode: withoutMakerNote.ExposureMode ?? 'No data'
                    }
                };

                const jsonString = JSON.stringify({
                    fileName: file.name,
                    metadata: withoutMakerNote
                }, (key, value) => {
                    if (value && value.buffer instanceof ArrayBuffer) {
                        return `Binary Data (${value.byteLength} bytes)`;
                    }
                    return value;
                }, 2);

                const jsonBlob = new Blob([jsonString], { type: 'application/json' });
                const jsonUrl = URL.createObjectURL(jsonBlob);
                
                const jsonLink = document.createElement('a');
                jsonLink.href = jsonUrl;
                const timestamp = new Date().toISOString().slice(0,10);
                jsonLink.download = `${file.name}_${timestamp}.json`;
                
                document.body.appendChild(jsonLink);
                jsonLink.click();
                document.body.removeChild(jsonLink);
                URL.revokeObjectURL(jsonUrl);

                resolve(selectedData);
            });
        });

        if (exifData) {
            selectedExifData.push(exifData);
        }
    }

    if (selectedExifData.length > 0) {
        const headers = [
            'File Name',
            'ISO',
            'GPS Longitude',
            'GPS Latitude',
            'Camera Make',
            'Camera Model',
            'Aperture Value',
            'Max Aperture Value',
            'Exposure Time',
            'Exposure Program',
            'Exposure Bias',
            'Exposure Mode'
        ];

        const rows = selectedExifData.map(data => [
            data.fileName,
            data.iso,
            data.gps.longitude,
            data.gps.latitude,
            data.camera.make,
            data.camera.model,
            data.aperture.value,
            data.aperture.maxValue,
            data.exposure.time,
            data.exposure.program,
            data.exposure.bias,
            data.exposure.mode
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => 
                row.map(cell => {
                    if (cell === null || cell === undefined) {
                        return '';
                    }
                    const cellStr = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return `"${cellStr.replace(/"/g, '""')}"`;
                    }
                    return cellStr;
                }).join(',')
            )
        ].join('\n');

        const timestamp = new Date().toISOString().slice(0,10);
        const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const csvUrl = URL.createObjectURL(csvBlob);
        
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `exif_data_summary_${timestamp}.csv`;
        
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);
    }

    output.innerHTML = `<pre>${JSON.stringify(selectedExifData, null, 2)}</pre>`;
});
