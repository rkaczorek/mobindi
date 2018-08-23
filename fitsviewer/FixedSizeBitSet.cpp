#include <cassert>
#include <stdexcept>
#include <string.h>

#include "FixedSizeBitSet.h"

#define ADDRESS_BITS_PER_WORD 6
#define BITS_PER_WORD  ((int)(1 << ADDRESS_BITS_PER_WORD))
#define BIT_INDEX_MASK (BITS_PER_WORD - 1)

/* Used to shift left or right for a partial word mask */
#define WORD_MASK ((uint64_t)0xffffffffffffffffL)


static int wordIndex(int offset)
{
    return offset >> 6;
}

static int getLongCount(int length)
{
    if ((length & 63) == 0) {
        return length / 64;
    } else {
        return length / 64 + 1;
    }
}

static int numberOfTrailingZeros(uint64_t value)
{
    if (!value) return 64;
    // FIXME: sizeof int
    if (sizeof(int) == 8) {
        return __builtin_ctz(value);
    }
    if (sizeof(long int) == 8) {
        return __builtin_ctzl(value);
    }
    if (sizeof(long long int) == 8) {
        return __builtin_ctzll(value);
    }
    throw std::invalid_argument("not int for 64bit here ?");
}

static int numberOfBitSet(uint64_t value)
{
    if (sizeof(int) == 8) {
        return __builtin_popcount(value);
    }
    if (sizeof(long int) == 8) {
        return __builtin_popcountl(value);
    }
    if (sizeof(long long int) == 8) {
        return __builtin_popcountll(value);
    }

    throw std::invalid_argument("not int for 64bit here ?");
}



FixedSizeBitSet::FixedSizeBitSet(int length) : length(length){
    this->words = new uint64_t[wordsLength()];
    memset(this->words, 0, sizeof(uint64_t) * wordsLength());
    this->cardinality = 0;
}

FixedSizeBitSet::FixedSizeBitSet(const FixedSizeBitSet & copy)
    : length(copy.length)
{
    this->words = new uint64_t[wordsLength()];
    memcpy(this->words, copy.words, sizeof(uint64_t) * wordsLength());
    this->cardinality = copy.cardinality;
}

int FixedSizeBitSet::wordsLength() const {
    return getLongCount(length);
}

bool FixedSizeBitSet::get(int offset) const
{
    assert(offset >= 0 && offset < length);
    int pos = offset >> 6;
    uint64_t bit = ((uint64_t)1) << (offset & 63);
    return (words[pos] & bit) != 0;
}
	
void FixedSizeBitSet::set(int offset)
{
    set(offset, true);
}
	
void FixedSizeBitSet::clear(int offset)
{
    set(offset, false);
}

void FixedSizeBitSet::set(int offset, bool b)
{
    assert(offset >= 0 && offset < length);
    int pos = offset >> 6;
    uint64_t bit = ((uint64_t)1) << (offset & 63);
    
    uint64_t l = words[pos];
    
    bool current = (l & bit) != 0;
    if (current == b) return;
    if (b) {
        l |= bit;
        if (cardinality != -1) cardinality ++;
    } else {
        l &= ~bit;
        if (cardinality != -1) cardinality --;
    }
    words[pos] = l;
}

int FixedSizeBitSet::nextSetBit(int fromIndex) const {
    assert(fromIndex >= 0);

    if (fromIndex >= length) return -1;
    
    int u = wordIndex(fromIndex);
    
    uint64_t word = words[u] & (WORD_MASK << fromIndex);

    while (true) {
        if (word != 0) {
            int ret = (u * BITS_PER_WORD) + numberOfTrailingZeros(word);
            if (ret >= this->length) {
                return -1;
            }
            return ret;
        }
        if (++u == wordsLength())
            return -1;
        word = words[u];
    }
}

/**
 * Returns the index of the first bit that is set to <code>false</code>
 * that occurs on or after the specified starting index.
 */
int FixedSizeBitSet::nextClearBit(int fromIndex) const {
    assert(fromIndex >= 0);

    if (fromIndex >= this->length) return -1;
    
    int u = wordIndex(fromIndex);
    
    uint64_t word = ~words[u] & (WORD_MASK << fromIndex);

    while (true) {
        if (word != 0) {
            int ret = (u * BITS_PER_WORD) + numberOfTrailingZeros(word);
            if (ret >= this->length) {
                return -1;
            }
            return ret;
        }
        if (++u == wordsLength())
            return -1;
        word = ~words[u];
    }
}

const FixedSizeBitSet & FixedSizeBitSet::operator &=(const FixedSizeBitSet & other)
{
    if (other.length != this->length) throw std::invalid_argument("and between different sets");
    for(int i = 0; i < wordsLength(); ++i)
    {
        words[i] &= other.words[i];
    }
    this->cardinality = -1;
}

const FixedSizeBitSet & FixedSizeBitSet::operator |=(const FixedSizeBitSet & other)
{
    if (other.length != this->length) throw std::invalid_argument("or between different sets");
    for(int i = 0; i < wordsLength(); ++i)
    {
        words[i] |= other.words[i];
    }
    this->cardinality = -1;
}

const FixedSizeBitSet & FixedSizeBitSet::operator ^=(const FixedSizeBitSet & other)
{
    if (other.length != this->length) throw std::invalid_argument("or between different sets");
    for(int i = 0; i < wordsLength(); ++i)
    {
        words[i] ^= other.words[i];
    }
    this->cardinality = -1;
}

FixedSizeBitSet * FixedSizeBitSet::shift(int amount) const
{
    if (amount == 0) return new FixedSizeBitSet(*this);
    FixedSizeBitSet * result = new FixedSizeBitSet(this->length);
    if (amount > 0)
    {
        int wordOffset = amount >> 6;
        int bitShift = amount & 63;
        
        if (bitShift != 0) {
            for(int i = 0; i + wordOffset < wordsLength(); ++i)
            {
                // Chaque mot va dans deux partie
                result->words[i + wordOffset] = this->words[i] << bitShift;
            }
            for(int i = 0; i + wordOffset + 1 < wordsLength(); ++i)
            {
                result->words[i + wordOffset + 1] |= this->words[i] >> (64 - bitShift);
            }
        } else {
            for(int i = 0; i + wordOffset < wordsLength(); ++i)
            {
                result->words[i + wordOffset] = this->words[i];
            }
        }
    } else {
        amount = -amount;
        int wordOffset = amount >> 6;
        int bitShift = amount & 63;
        
        if (bitShift != 0) {
            for(int i = 0; i + wordOffset < wordsLength(); ++i)
            {
                result->words[i] = this->words[i + wordOffset] >> bitShift;
            }
            
            for(int i = 0; i + wordOffset + 1 < wordsLength(); ++i)
            {
                result->words[i] |= this->words[i + wordOffset + 1] << (64 - bitShift);
            }
        } else {
            for(int i = 0; i + wordOffset < wordsLength(); ++i)
            {
                result->words[i] = this->words[i + wordOffset];
            }
        }
    }
    
    return result;
}


void FixedSizeBitSet::invert()
{
    for(int i = 0; i < wordsLength(); ++i)
    {
        words[i] = ~words[i];
    }
    if ((length & 63) != 0) {
        int bitsToKeep = (length & 63);
        words[wordsLength() - 1] &= ~(WORD_MASK << bitsToKeep);
    }
    
    if (this->cardinality != -1) {
        this->cardinality = this->length - this->cardinality;
    }
}

int FixedSizeBitSet::getCardinality() const
{
    if (this->cardinality == -1) {
        int sum = 0;
        for (int i = 0; i < wordsLength(); i++)
            sum += numberOfBitSet(words[i]);
        this->cardinality = sum;
    }
    return this->cardinality;
}


std::string FixedSizeBitSet::toString() const {
    std::string result;

    for(int i = 0; i < length; ++i)
    {
        if (get(i)) {
            result += 'x';
        } else {
            result += '.';
        }
    }
    return result;
}

int FixedSizeBitSet::size() const {
    return length;
}
