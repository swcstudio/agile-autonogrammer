use napi::bindgen_prelude::*;
use napi_derive::napi;
use bumpalo::Bump;
use std::sync::Arc;
use parking_lot::Mutex;
use memmap2::{Mmap, MmapMut, MmapOptions};
use std::fs::{File, OpenOptions};
use std::io::Write;
use bytemuck::{self};

#[napi]
pub struct BumpAllocator {
    arena: Arc<Mutex<Bump>>,
}

#[napi]
impl BumpAllocator {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            arena: Arc::new(Mutex::new(Bump::new())),
        }
    }

    #[napi(factory)]
    pub fn with_capacity(capacity: u32) -> Self {
        Self {
            arena: Arc::new(Mutex::new(Bump::with_capacity(capacity as usize))),
        }
    }

    #[napi]
    pub fn alloc_string(&self, value: String) -> Result<()> {
        let arena = self.arena.lock();
        let _ = arena.alloc_str(&value);
        Ok(())
    }

    #[napi]
    pub fn alloc_bytes(&self, size: u32) -> Result<()> {
        let arena = self.arena.lock();
        let _ = arena.alloc_slice_fill_default::<u8>(size as usize);
        Ok(())
    }

    #[napi]
    pub fn allocated_bytes(&self) -> u32 {
        self.arena.lock().allocated_bytes() as u32
    }

    #[napi]
    pub fn reset(&self) {
        self.arena.lock().reset();
    }

    #[napi]
    pub fn chunk_capacity(&self) -> u32 {
        self.arena.lock().chunk_capacity() as u32
    }
}

#[napi]
pub struct MemoryMappedFile {
    mmap: Option<Mmap>,
    mmap_mut: Option<Arc<Mutex<MmapMut>>>,
    path: String,
    size: usize,
}

#[napi]
impl MemoryMappedFile {
    #[napi(factory)]
    pub fn open_read(path: String) -> Result<Self> {
        let file = File::open(&path)
            .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
        
        let mmap = unsafe {
            MmapOptions::new()
                .map(&file)
                .map_err(|e| Error::from_reason(format!("Failed to mmap file: {}", e)))?
        };
        
        let size = mmap.len();
        
        Ok(Self {
            mmap: Some(mmap),
            mmap_mut: None,
            path,
            size,
        })
    }

    #[napi(factory)]
    pub fn open_write(path: String, size: u32) -> Result<Self> {
        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .open(&path)
            .map_err(|e| Error::from_reason(format!("Failed to open file: {}", e)))?;
        
        file.set_len(size as u64)
            .map_err(|e| Error::from_reason(format!("Failed to set file size: {}", e)))?;
        
        let mmap = unsafe {
            MmapOptions::new()
                .map_mut(&file)
                .map_err(|e| Error::from_reason(format!("Failed to mmap file: {}", e)))?
        };
        
        Ok(Self {
            mmap: None,
            mmap_mut: Some(Arc::new(Mutex::new(mmap))),
            path,
            size: size as usize,
        })
    }

    #[napi]
    pub fn read(&self, offset: u32, length: u32) -> Result<Vec<u8>> {
        let offset = offset as usize;
        let length = length as usize;
        
        if offset + length > self.size {
            return Err(Error::from_reason("Read out of bounds"));
        }
        
        if let Some(ref mmap) = self.mmap {
            Ok(mmap[offset..offset + length].to_vec())
        } else if let Some(ref mmap_mut) = self.mmap_mut {
            let mmap = mmap_mut.lock();
            Ok(mmap[offset..offset + length].to_vec())
        } else {
            Err(Error::from_reason("Memory map not initialized"))
        }
    }

    #[napi]
    pub fn read_string(&self, offset: u32, length: u32) -> Result<String> {
        let bytes = self.read(offset, length)?;
        String::from_utf8(bytes)
            .map_err(|e| Error::from_reason(format!("Invalid UTF-8: {}", e)))
    }

    #[napi]
    pub fn write(&self, offset: u32, data: Vec<u8>) -> Result<()> {
        let offset = offset as usize;
        
        if offset + data.len() > self.size {
            return Err(Error::from_reason("Write out of bounds"));
        }
        
        if let Some(ref mmap_mut) = self.mmap_mut {
            let mut mmap = mmap_mut.lock();
            mmap[offset..offset + data.len()].copy_from_slice(&data);
            Ok(())
        } else {
            Err(Error::from_reason("File not opened for writing"))
        }
    }

    #[napi]
    pub fn write_string(&self, offset: u32, data: String) -> Result<()> {
        self.write(offset, data.into_bytes())
    }

    #[napi]
    pub fn flush(&self) -> Result<()> {
        if let Some(ref mmap_mut) = self.mmap_mut {
            let mmap = mmap_mut.lock();
            mmap.flush()
                .map_err(|e| Error::from_reason(format!("Failed to flush: {}", e)))?;
        }
        Ok(())
    }

    #[napi]
    pub fn size(&self) -> u32 {
        self.size as u32
    }

    #[napi]
    pub fn path(&self) -> String {
        self.path.clone()
    }
}

#[napi]
pub struct MemoryPool {
    pools: Arc<Mutex<Vec<Vec<u8>>>>,
    block_size: usize,
    free_blocks: Arc<Mutex<Vec<usize>>>,
}

#[napi]
impl MemoryPool {
    #[napi(constructor)]
    pub fn new(block_size: u32, initial_blocks: u32) -> Self {
        let block_size = block_size as usize;
        let mut pools = Vec::with_capacity(initial_blocks as usize);
        let mut free_blocks = Vec::with_capacity(initial_blocks as usize);
        
        for i in 0..initial_blocks {
            pools.push(vec![0u8; block_size]);
            free_blocks.push(i as usize);
        }
        
        Self {
            pools: Arc::new(Mutex::new(pools)),
            block_size,
            free_blocks: Arc::new(Mutex::new(free_blocks)),
        }
    }

    #[napi]
    pub fn allocate(&self) -> Result<u32> {
        let mut free_blocks = self.free_blocks.lock();
        
        if let Some(block_id) = free_blocks.pop() {
            Ok(block_id as u32)
        } else {
            // Allocate new block
            let mut pools = self.pools.lock();
            let block_id = pools.len();
            pools.push(vec![0u8; self.block_size]);
            Ok(block_id as u32)
        }
    }

    #[napi]
    pub fn deallocate(&self, block_id: u32) -> Result<()> {
        let block_id = block_id as usize;
        let pools = self.pools.lock();
        
        if block_id >= pools.len() {
            return Err(Error::from_reason("Invalid block ID"));
        }
        
        let mut free_blocks = self.free_blocks.lock();
        free_blocks.push(block_id);
        Ok(())
    }

    #[napi]
    pub fn write(&self, block_id: u32, offset: u32, data: Vec<u8>) -> Result<()> {
        let block_id = block_id as usize;
        let offset = offset as usize;
        
        let mut pools = self.pools.lock();
        
        if block_id >= pools.len() {
            return Err(Error::from_reason("Invalid block ID"));
        }
        
        if offset + data.len() > self.block_size {
            return Err(Error::from_reason("Write exceeds block size"));
        }
        
        pools[block_id][offset..offset + data.len()].copy_from_slice(&data);
        Ok(())
    }

    #[napi]
    pub fn read(&self, block_id: u32, offset: u32, length: u32) -> Result<Vec<u8>> {
        let block_id = block_id as usize;
        let offset = offset as usize;
        let length = length as usize;
        
        let pools = self.pools.lock();
        
        if block_id >= pools.len() {
            return Err(Error::from_reason("Invalid block ID"));
        }
        
        if offset + length > self.block_size {
            return Err(Error::from_reason("Read exceeds block size"));
        }
        
        Ok(pools[block_id][offset..offset + length].to_vec())
    }

    #[napi]
    pub fn block_size(&self) -> u32 {
        self.block_size as u32
    }

    #[napi]
    pub fn total_blocks(&self) -> u32 {
        self.pools.lock().len() as u32
    }

    #[napi]
    pub fn free_blocks(&self) -> u32 {
        self.free_blocks.lock().len() as u32
    }

    #[napi]
    pub fn used_blocks(&self) -> u32 {
        let total = self.pools.lock().len();
        let free = self.free_blocks.lock().len();
        (total - free) as u32
    }
}

#[napi]
pub fn create_bump_allocator() -> BumpAllocator {
    BumpAllocator::new()
}

#[napi]
pub fn create_memory_pool(block_size: u32, initial_blocks: u32) -> MemoryPool {
    MemoryPool::new(block_size, initial_blocks)
}