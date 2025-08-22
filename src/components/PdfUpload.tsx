import { AlertCircle, CheckCircle, FileText, Upload, X } from 'lucide-react';
import React, { useRef, useState } from 'react';
import { apiService, ApiTicket } from '../services/api';
import { PdfUploadResponse } from '../types/pdf';

interface PdfUploadProps {
    onDataExtracted: (data: Partial<ApiTicket>) => void;
}

export default function PdfUpload({ onDataExtracted }: PdfUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<PdfUploadResponse | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        if (file.type !== 'application/pdf') {
            setUploadResult({
                success: false,
                error: 'Please select a PDF file'
            });
            return;
        }

        try {
            setUploading(true);
            setUploadResult(null);

            const result = await apiService.uploadPdf(file);
            setUploadResult(result);

            if (result.success && result.data) {
                onDataExtracted(result.data);
            }
        } catch (error) {
            setUploadResult({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to upload PDF'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFileSelect(files[0]);
        }
    };

    const clearResult = () => {
        setUploadResult(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Upload Ticket PDF
            </h2>

            <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {uploading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-gray-600">Processing PDF...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                            Drop your ticket PDF here
                        </p>
                        <p className="text-gray-600 mb-4">
                            or click to browse files
                        </p>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition duration-200"
                        >
                            Choose PDF File
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />
                    </div>
                )}
            </div>

            {uploadResult && (
                <div className={`mt-4 p-4 rounded-lg ${uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            {uploadResult.success ? (
                                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            )}
                            <div>
                                <h3 className={`font-medium ${uploadResult.success ? 'text-green-800' : 'text-red-800'
                                    }`}>
                                    {uploadResult.success ? 'PDF Processed Successfully!' : 'Processing Failed'}
                                </h3>
                                {uploadResult.success ? (
                                    <p className="text-green-700 text-sm mt-1">
                                        Ticket details have been extracted and populated in the form below.
                                    </p>
                                ) : (
                                    <p className="text-red-700 text-sm mt-1">
                                        {uploadResult.error}
                                    </p>
                                )}
                                {uploadResult.success && uploadResult.data && (
                                    <div className="mt-2 text-sm text-green-700">
                                        <p><strong>Extracted:</strong></p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {uploadResult.data.pnr && <li>PNR: {uploadResult.data.pnr}</li>}
                                            {uploadResult.data.passengerName && <li>Passenger: {uploadResult.data.passengerName}</li>}
                                            {uploadResult.data.fare && <li>Fare: ₹{uploadResult.data.fare}</li>}
                                            {uploadResult.data.type && <li>Type: {uploadResult.data.type}</li>}
                                            {uploadResult.data.place && <li>Route: {uploadResult.data.place}</li>}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={clearResult}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <div className="mt-4 text-sm text-gray-600">
                <p><strong>Supported formats:</strong> PDF files up to 10MB</p>
                <p><strong>Extractable data:</strong> PNR, passenger name, fare, booking date, route, and ticket type</p>
            </div>
        </div>
    );
}
