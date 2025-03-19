import useUserStore from "../store/useUserStore";

const useForm = () => {
  const { formData, setFormData, submitForm } = useUserStore();
};
export default useForm;
