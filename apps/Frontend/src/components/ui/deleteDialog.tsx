export const DeleteConfirmationDialog = ({
  isOpen,
  onConfirm,
  onCancel,
  patientName,
}: {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  patientName?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-md shadow-md w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
        <p>Are you sure you want to delete <strong>{patientName}</strong>?</p>
        <div className="mt-6 flex justify-end space-x-4">
          <button
            className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
