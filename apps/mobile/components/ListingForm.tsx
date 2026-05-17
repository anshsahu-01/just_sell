import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Input } from "@/components/Input";
import * as categoryService from "@/services/category.service";
import { Category } from "@/types";

const CONDITIONS = ["New", "Like New", "Good", "Fair"];

export type ListingFormValues = {
  title: string;
  description: string;
  price: string;
  condition: string;
  categoryId: string;
  images: string[];
};

type ListingFormProps = {
  initialValues?: ListingFormValues;
  submitLabel: string;
  loading?: boolean;
  error?: string;
  onSubmit: (values: ListingFormValues) => Promise<void> | void;
};

const defaultValues: ListingFormValues = {
  title: "",
  description: "",
  price: "",
  condition: "Good",
  categoryId: "",
  images: [],
};

export function ListingForm({
  initialValues,
  submitLabel,
  loading,
  error,
  onSubmit,
}: ListingFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [title, setTitle] = useState(initialValues?.title ?? defaultValues.title);
  const [description, setDescription] = useState(
    initialValues?.description ?? defaultValues.description
  );
  const [price, setPrice] = useState(initialValues?.price ?? defaultValues.price);
  const [condition, setCondition] = useState(
    initialValues?.condition ?? defaultValues.condition
  );
  const [categoryId, setCategoryId] = useState(
    initialValues?.categoryId ?? defaultValues.categoryId
  );
  const [images, setImages] = useState<string[]>(initialValues?.images ?? defaultValues.images);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (!initialValues) return;
    setTitle(initialValues.title);
    setDescription(initialValues.description);
    setPrice(initialValues.price);
    setCondition(initialValues.condition);
    setCategoryId(initialValues.categoryId);
    setImages(initialValues.images);
  }, [initialValues]);

  const pickImages = async () => {
    const remaining = 5 - images.length;
    if (remaining <= 0) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
      mediaTypes: ["images"],
    });

    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((asset) => asset.uri)].slice(0, 5));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim() || !price || !categoryId) {
      setLocalError("Fill all required fields");
      return;
    }

    if (!images.length) {
      setLocalError("Add at least one photo");
      return;
    }

    setLocalError("");

    await onSubmit({
      title: title.trim(),
      description: description.trim(),
      price,
      condition,
      categoryId,
      images,
    });
  };

  return (
    <View className="rounded-2xl border border-line bg-white p-4">
      <Text className="mb-2 mt-2 text-[13px] font-medium text-muted">
        Photos ({images.length}/5)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
        <Pressable
          className="mr-2 h-20 w-20 items-center justify-center rounded-xl border border-dashed border-line bg-white"
          onPress={pickImages}
        >
          <Text className="text-[13px] text-muted">+ Add</Text>
        </Pressable>
        {images.map((uri, index) => (
          <Pressable key={`${uri}-${index}`} onPress={() => removeImage(index)}>
            <Image source={{ uri }} className="mr-2 h-20 w-20 rounded-xl" />
          </Pressable>
        ))}
      </ScrollView>

      <Input label="Title" value={title} onChangeText={setTitle} placeholder="What are you selling?" />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Describe condition, usage, etc."
        multiline
        inputClassName="h-[88px] pt-3"
      />
      <Input
        label="Price (Rs)"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
        placeholder="0"
      />

      <Text className="mb-2 mt-2 text-[13px] font-medium text-muted">Category</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {categories.map((cat) => (
          <Chip
            key={cat.id}
            label={cat.name}
            active={categoryId === cat.id}
            onPress={() => setCategoryId(cat.id)}
          />
        ))}
      </View>

      <Text className="mb-2 text-[13px] font-medium text-muted">Condition</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {CONDITIONS.map((item) => (
          <Chip
            key={item}
            label={item}
            active={condition === item}
            onPress={() => setCondition(item)}
          />
        ))}
      </View>

      {localError || error ? (
        <Text className="mb-3 text-[13px] text-danger">{localError || error}</Text>
      ) : null}
      <Button title={submitLabel} onPress={handleSubmit} loading={loading} className="rounded-2xl" />
    </View>
  );
}
