import { useState, useEffect } from 'react';

export function useBreadcrumb(buildingId?: string, floorId?: string, roomId?: string) {
  const [buildingName, setBuildingName] = useState<string>('...');
  const [floorName, setFloorName] = useState<string>('...');
  const [roomName, setRoomName] = useState<string>('...');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchNames = async () => {
      setIsLoading(true);
      try {
        const promises = [];

        // 1. ดึงชื่อตึก
        if (buildingId) {
          promises.push(
            fetch(`/api/buildings/${buildingId}`)
              .then(res => res.json())
              .then(data => setBuildingName(data.name || `ตึก ${buildingId}`))
              .catch(() => setBuildingName(`ตึก ${buildingId}`))
          );
        }

        // 2. ดึงชื่อชั้น
        if (floorId) {
          promises.push(
            fetch(`/api/floors/${floorId}`)
              .then(res => res.json())
              .then(data => {
                setFloorName(
                  data.name || (data.floorNumber ? `ชั้น ${data.floorNumber}` : `ชั้น ${floorId}`)
                );
              })
              .catch(() => setFloorName(`ชั้น ${floorId}`))
          );
        }

        // 3. ดึงชื่อห้อง
        if (roomId) {
          promises.push(
            fetch(`/api/rooms/${roomId}`)
              .then(res => res.json())
              .then(data => setRoomName(data.roomName || data.roomNumber || `ห้อง ${roomId}`))
              .catch(() => setRoomName(`ห้อง ${roomId}`))
          );
        }

        await Promise.all(promises);
      } catch (error) {
        console.error("Error fetching breadcrumb data", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNames();
  }, [buildingId, floorId, roomId]);

  return { buildingName, floorName, roomName, isLoading };
}
